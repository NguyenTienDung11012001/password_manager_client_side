// api/gist.js
// Vercel Serverless Function — proxy an toàn + xác thực per-user.
//
// FIX #1: GITHUB_TOKEN chỉ sống ở server (không prefix VITE_).
// FIX #2: Mỗi user phải chứng minh biết master password (authProof) mới đọc/ghi được.
//         Server KHÔNG bao giờ thấy master password. Kiểu zero-knowledge:
//           authSalt     = HMAC-SHA256(SERVER_SECRET, "auth:" + username)   (server tính)
//           authProof    = PBKDF2(masterPassword, authSalt)                 (client tính, gửi lên)
//           authVerifier = SHA-256(authProof)                               (server lưu trong gist)
//         So khớp bằng timingSafeEqual để chống timing attack.
//
// Biến môi trường cần có (Vercel → Settings → Environment Variables):
//   GITHUB_TOKEN   = token scope "gist"
//   GIST_ID        = id gist lưu dữ liệu
//   SERVER_SECRET  = chuỗi ngẫu nhiên dài (>= 32 ký tự), dùng cho HMAC salt

import crypto from 'node:crypto';

const GITHUB_API = 'https://api.github.com/gists/';
const USERNAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;

// --- Rate limiting (best-effort, in-memory) ---
// Lưu ý: serverless có nhiều instance/ cold start nên đây chỉ là lớp phòng thủ nhẹ.
// Để chống brute-force thật sự, dùng Vercel KV / Upstash Redis.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 30; // tối đa 30 request / phút / IP
const rlStore = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const entry = rlStore.get(ip);
  if (!entry || now > entry.reset) {
    rlStore.set(ip, { count: 1, reset: now + RL_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RL_MAX;
}

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GIST_ID;
  const serverSecret = process.env.SERVER_SECRET;
  if (!token || !gistId || !serverSecret) {
    throw new Error('Server thiếu GITHUB_TOKEN / GIST_ID / SERVER_SECRET.');
  }
  return { token, gistId, serverSecret };
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

function authSaltFor(username, serverSecret) {
  return crypto.createHmac('sha256', serverSecret).update('auth:' + username).digest('base64');
}
function verifierOf(authProof) {
  return crypto.createHash('sha256').update(String(authProof)).digest('base64');
}
function safeEqual(a, b) {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

async function readGist(token, gistId) {
  const res = await fetch(`${GITHUB_API}${gistId}`, { method: 'GET', headers: githubHeaders(token) });
  if (!res.ok) throw new Error(`GitHub GET ${res.status}`);
  return res.json();
}
function readUserFile(gist, username) {
  const file = gist.files && gist.files[`${username}.json`];
  if (!file) return null;
  try {
    return JSON.parse(file.content); // { version, owner, authVerifier, payload, updatedAt }
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  let config;
  try {
    config = getConfig();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  const { token, gistId, serverSecret } = config;

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Quá nhiều yêu cầu. Thử lại sau.' });
  }

  try {
    // --- GET: trả authSalt (deterministic, không lộ user có tồn tại hay không) ---
    if (req.method === 'GET') {
      const username = String(req.query.username || '');
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({ error: 'username không hợp lệ.' });
      }
      return res.status(200).json({ authSalt: authSaltFor(username, serverSecret) });
    }

    // --- POST: fetch (đọc) hoặc save (ghi), đều cần authProof ---
    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const username = String(body.username || '');
      const authProof = body.authProof;
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({ error: 'username không hợp lệ.' });
      }
      if (typeof authProof !== 'string' || authProof.length < 16) {
        return res.status(400).json({ error: 'authProof không hợp lệ.' });
      }

      const gist = await readGist(token, gistId);
      const existing = readUserFile(gist, username);
      const isSave = typeof body.payload === 'string' && body.action !== 'fetch';

      // --- FETCH ---
      if (!isSave) {
        if (!existing) {
          // Không tồn tại -> 401 (giống sai mật khẩu, chống enumeration).
          return res.status(401).json({ error: 'Xác thực thất bại.' });
        }
        if (!existing.authVerifier) {
          // MIGRATION: file v1 (chưa có verifier) -> cho đọc để người dùng cũ đăng nhập.
          // Lần lưu kế tiếp sẽ gắn authVerifier và nâng cấp lên v2.
          return res.status(200).json({ payload: existing.payload ?? null, legacy: true });
        }
        if (!safeEqual(verifierOf(authProof), existing.authVerifier)) {
          return res.status(401).json({ error: 'Xác thực thất bại.' });
        }
        return res.status(200).json({ payload: existing.payload ?? null });
      }

      // --- SAVE ---
      const payload = body.payload;
      if (payload.length === 0 || payload.length > 1_000_000) {
        return res.status(400).json({ error: 'payload không hợp lệ.' });
      }
      // Nếu user đã tồn tại VÀ đã có verifier (v2): phải đúng proof mới được ghi đè.
      // File v1 (chưa có verifier) sẽ được nâng cấp: proof hiện tại trở thành verifier.
      if (existing && existing.authVerifier) {
        if (!safeEqual(verifierOf(authProof), existing.authVerifier)) {
          return res.status(401).json({ error: 'Xác thực thất bại.' });
        }
      }
      // Giữ nguyên verifier cũ (nếu có) hoặc tạo mới khi đăng ký lần đầu.
      const authVerifier = existing && existing.authVerifier ? existing.authVerifier : verifierOf(authProof);

      const content = JSON.stringify({
        version: 2,
        owner: username,
        authVerifier,
        payload,
        updatedAt: Date.now(),
      });

      const ghRes = await fetch(`${GITHUB_API}${gistId}`, {
        method: 'PATCH',
        headers: githubHeaders(token),
        body: JSON.stringify({ files: { [`${username}.json`]: { content } } }),
      });
      if (!ghRes.ok) {
        return res.status(502).json({ error: `GitHub PATCH ${ghRes.status}` });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method không được hỗ trợ.' });
  } catch (e) {
    return res.status(500).json({ error: `Lỗi máy chủ: ${e.message}` });
  }
}

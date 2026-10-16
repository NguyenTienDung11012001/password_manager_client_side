// api/gist.js
// Vercel Serverless Function — proxy an toàn giữa client và GitHub Gist.
//
// FIX #1: GitHub token KHÔNG còn nằm ở client nữa. Nó chỉ tồn tại trong
// biến môi trường server-side (KHÔNG có prefix VITE_ nên không bị nhúng vào bundle).
//
// Cấu hình trên Vercel (Project Settings → Environment Variables):
//   GITHUB_TOKEN = <personal access token mới, scope "gist">
//   GIST_ID      = <id của gist dùng để lưu dữ liệu>
//
// Client chỉ gọi:
//   GET  /api/gist?username=<user>        -> { payload: <base64|null> }
//   POST /api/gist  { username, payload } -> { ok: true }

const GITHUB_API = 'https://api.github.com/gists/';

// Chỉ cho phép username "sạch" để tránh lạm dụng tên file.
const USERNAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const gistId = process.env.GIST_ID;
  if (!token || !gistId) {
    throw new Error('Server chưa cấu hình GITHUB_TOKEN và GIST_ID.');
  }
  return { token, gistId };
}

function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
  };
}

export default async function handler(req, res) {
  let config;
  try {
    config = getConfig();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  const { token, gistId } = config;

  try {
    if (req.method === 'GET') {
      const username = String(req.query.username || '');
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({ error: 'username không hợp lệ.' });
      }

      const ghRes = await fetch(`${GITHUB_API}${gistId}`, {
        method: 'GET',
        headers: githubHeaders(token),
      });
      if (!ghRes.ok) {
        return res.status(502).json({ error: `GitHub trả về ${ghRes.status}` });
      }

      const gist = await ghRes.json();
      const fileName = `${username}.json`;
      const file = gist.files && gist.files[fileName];
      if (!file) {
        return res.status(200).json({ payload: null });
      }

      let payload = null;
      try {
        payload = JSON.parse(file.content).payload ?? null;
      } catch {
        payload = null;
      }
      return res.status(200).json({ payload });
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }
      body = body || {};

      const username = String(body.username || '');
      const payload = body.payload;
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({ error: 'username không hợp lệ.' });
      }
      if (typeof payload !== 'string' || payload.length === 0) {
        return res.status(400).json({ error: 'payload không hợp lệ.' });
      }

      const fileName = `${username}.json`;
      const content = JSON.stringify({
        version: 1,
        owner: username,
        payload,
        updatedAt: Date.now(),
      });

      const ghRes = await fetch(`${GITHUB_API}${gistId}`, {
        method: 'PATCH',
        headers: githubHeaders(token),
        body: JSON.stringify({ files: { [fileName]: { content } } }),
      });
      if (!ghRes.ok) {
        return res.status(502).json({ error: `GitHub trả về ${ghRes.status}` });
      }
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method không được hỗ trợ.' });
  } catch (e) {
    return res.status(500).json({ error: `Lỗi máy chủ: ${e.message}` });
  }
}

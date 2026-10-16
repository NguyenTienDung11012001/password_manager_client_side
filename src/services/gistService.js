// src/services/gistService.js
//
// Giao tiếp với serverless proxy /api/gist.
// FIX #2: mọi thao tác đọc/ghi phải kèm authProof (chứng minh biết master password).

const API_URL = '/api/gist';

export class GistService {
  /**
   * Lấy authSalt (do server dẫn xuất từ username) để client tính authProof.
   * @param {string} username
   * @returns {Promise<string>} authSalt base64
   */
  async getAuthSalt(username) {
    const res = await fetch(`${API_URL}?username=${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Không lấy được thông tin đăng nhập (HTTP ${res.status}).`);
    const data = await res.json();
    if (!data.authSalt) throw new Error('Phản hồi server thiếu authSalt.');
    return data.authSalt;
  }

  /**
   * Đọc payload của user — cần authProof đúng.
   * @returns {Promise<{payload: string|null, authFailed: boolean}>}
   */
  async fetchUserData(username, authProof) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, authProof, action: 'fetch' }),
    });

    if (res.status === 401) {
      // Tài khoản mới HOẶC sai master password (không phân biệt để chống dò).
      return { payload: null, authFailed: true };
    }
    if (!res.ok) throw new Error(`Không thể tải dữ liệu (HTTP ${res.status}).`);

    const data = await res.json();
    return { payload: data.payload ?? null, authFailed: false };
  }

  /**
   * Ghi payload — cần authProof đúng (nếu user đã tồn tại). Lần đầu = đăng ký.
   * @throws {Error} 'AUTH_FAILED' nếu sai master password cho tài khoản đã tồn tại.
   */
  async updateUserData(username, authProof, encryptedPayload) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, authProof, payload: encryptedPayload }),
    });

    if (res.status === 401) throw new Error('AUTH_FAILED');
    if (!res.ok) throw new Error(`Không thể lưu dữ liệu (HTTP ${res.status}).`);
  }
}

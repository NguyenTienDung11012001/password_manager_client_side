// src/services/gistService.js
//
// FIX #1: Client KHÔNG còn giữ GitHub token hay Gist ID nữa.
// Mọi thao tác đi qua serverless function /api/gist (xem api/gist.js),
// nơi token được giữ an toàn ở phía server.

const API_URL = '/api/gist';

/**
 * Service tương tác với Gist thông qua proxy server-side.
 */
export class GistService {
  /**
   * Lấy payload đã mã hóa của một user.
   * @param {string} username
   * @returns {Promise<string|null>} payload base64, hoặc null nếu chưa có.
   */
  async fetchUserData(username) {
    try {
      const response = await fetch(`${API_URL}?username=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const data = await response.json();
      return data.payload ?? null;
    } catch (error) {
      console.error(`Failed to fetch data for user "${username}":`, error);
      throw new Error(`Could not fetch data for user "${username}". Check network.`);
    }
  }

  /**
   * Cập nhật payload đã mã hóa cho một user.
   * @param {string} username
   * @param {string} encryptedPayload
   * @returns {Promise<void>}
   */
  async updateUserData(username, encryptedPayload) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, payload: encryptedPayload }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
    } catch (error) {
      console.error(`Failed to update data for user "${username}":`, error);
      throw new Error(`Could not save data for user "${username}". Check network.`);
    }
  }
}

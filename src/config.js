// src/config.js
//
// FIX #1: Client không còn đọc GitHub token / Gist ID nữa.
// Chúng được cấu hình phía server (GITHUB_TOKEN, GIST_ID) và dùng trong api/gist.js.
// Giữ lại export `githubConfig` để tương thích với App.vue.

export const githubConfig = {
  error: null,
};

// src/config.js

const GIST_ID = import.meta.env.VITE_GIST_ID;
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_ACCESS_TOKEN;

let configErrorMessage = null;
if (!GIST_ID || !GITHUB_TOKEN) {
  configErrorMessage = 'Các biến môi trường VITE_GIST_ID và VITE_GITHUB_ACCESS_TOKEN là bắt buộc. ' +
                       'Vui lòng tạo file .env.local và khai báo chúng, hoặc cấu hình trên Vercel.';
}

export const githubConfig = {
  gistId: GIST_ID,
  githubToken: GITHUB_TOKEN,
  error: configErrorMessage,
};

import { ref, watchEffect } from 'vue';

const THEME_STORAGE_KEY = 'password-manager-theme';

export function useTheme() {
  // 1. Lấy giá trị từ localStorage hoặc fallback theo hệ thống
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
      return savedTheme;
    }
    // Fallback to system preference if no theme is saved
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light'; // Mặc định là light mode
  };

  // 2. Tạo một reactive ref để chứa theme hiện tại
  const theme = ref(getInitialTheme());

  // 3. Hàm để chuyển đổi theme
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  }

  // 4. Theo dõi sự thay đổi của theme và thực hiện các side effect
  watchEffect(() => {
    // Cập nhật localStorage
    localStorage.setItem(THEME_STORAGE_KEY, theme.value);
    
    // Cập nhật class trên thẻ <html>
    const root = document.documentElement;
    if (theme.value === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  });

  // 5. Trả về các biến và hàm cần thiết cho component
  return {
    theme,
    toggleTheme,
  };
}

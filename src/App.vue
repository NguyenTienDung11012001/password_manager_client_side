<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { GistService } from './services/gistService.js';
import { encrypt, decrypt } from './crypto/crypto.js';
import { useTheme } from './composables/useTheme.js';

// --- Components ---
import PasswordList from './components/PasswordList.vue';
import PasswordModal from './components/PasswordModal.vue';
import SettingsModal from './components/SettingsModal.vue';

// --- Theme ---
const { theme, toggleTheme } = useTheme();

// --- Reactive State ---
const settings = reactive({
  masterPassword: '',
  gistId: '',
  githubToken: '',
});

// User-related state
const username = ref('');
const inputUsername = ref('');
const showUserPrompt = ref(false);

const items = ref([]); // Decrypted password items
const isLoading = ref(false);
const error = ref(null);
const isLocked = ref(true);
const showSettings = ref(false);
const showPasswordModal = ref(false);
const currentItemToEdit = ref(null);

// --- Computed Properties ---
const areSettingsComplete = computed(() => {
  return settings.masterPassword && settings.gistId && settings.githubToken;
});

const isReady = computed(() => {
  return username.value && areSettingsComplete.value && !isLocked.value;
});

const sortedItems = computed(() => {
  return [...items.value].sort((a, b) => {
    const appA = a.app ? a.app.toLowerCase() : '';
    const appB = b.app ? b.app.toLowerCase() : '';
    return appA.localeCompare(appB);
  });
});

const groupedItems = computed(() => {
  const groups = sortedItems.value.reduce((acc, item) => {
    const firstLetter = item.app ? item.app[0].toUpperCase() : '#';
    const groupKey = firstLetter.match(/[A-Z]/) ? firstLetter : '#';
    
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(item);
    return acc;
  }, {});
  return groups;
});

// --- Service Initialization ---
let gistService;

function initializeService() {
  if (areSettingsComplete.value) {
    gistService = new GistService(settings.gistId, settings.githubToken);
  } else {
    gistService = null;
    isLocked.value = true;
  }
}

// --- Core Logic ---
async function loadData() {
  if (!areSettingsComplete.value || !username.value) {
    error.value = "Cài đặt hoặc thông tin người dùng chưa hoàn tất.";
    if (!areSettingsComplete.value) showSettings.value = true;
    if (!username.value) showUserPrompt.value = true;
    return;
  }

  isLoading.value = true;
  error.value = null;
  
  try {
    initializeService();
    const encryptedPayload = await gistService.fetchUserData(username.value);

    if (encryptedPayload) {
      const decryptedData = await decrypt(encryptedPayload, settings.masterPassword);
      items.value = decryptedData.items || [];
    } else {
      items.value = [];
    }
    isLocked.value = false;
  } catch (e) {
    error.value = `Không thể tải dữ liệu: ${e.message}. Sai Master Password hoặc lỗi mạng.`;
    isLocked.value = true; 
  } finally {
    isLoading.value = false;
  }
}

async function saveData() {
  if (isLocked.value) {
    error.value = "Ứng dụng đang bị khóa. Không thể lưu.";
    return;
  }
  if (!username.value) {
    error.value = "Không có người dùng nào được chọn. Không thể lưu.";
    return;
  }

  isLoading.value = true;
  error.value = null;
  
  try {
    const dataToEncrypt = { items: items.value };
    const encryptedPayload = await encrypt(dataToEncrypt, settings.masterPassword);
    await gistService.updateUserData(username.value, encryptedPayload);
  } catch (e) {
    error.value = `Lỗi khi lưu dữ liệu: ${e.message}`;
  } finally {
    isLoading.value = false;
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  settings.masterPassword = localStorage.getItem('dungNtPassword') || '';
  settings.gistId = localStorage.getItem('dungNtGistId') || '';
  settings.githubToken = localStorage.getItem('dungNtGithubToken') || '';
  
  const savedUsername = localStorage.getItem('dungNtUsername');

  if (savedUsername) {
    username.value = savedUsername;
    if (areSettingsComplete.value) {
      loadData();
    } else {
      showSettings.value = true;
    }
  } else {
    showUserPrompt.value = true;
  }
});

// --- Event Handlers ---
function handleUserSelect() {
  const newUsername = inputUsername.value.trim();
  if (!newUsername) {
    error.value = "Username không được để trống.";
    return;
  }
  error.value = null;
  username.value = newUsername;
  localStorage.setItem('dungNtUsername', newUsername);
  showUserPrompt.value = false;

  // After selecting a user, check if settings are ready
  if (areSettingsComplete.value) {
    loadData();
  } else {
    showSettings.value = true; // Prompt for settings if not configured
  }
}

function handleSwitchUser() {
  if (confirm('Bạn có chắc muốn đổi người dùng? Mọi thông tin chưa lưu có thể bị mất.')) {
    // Clear user-specific data
    localStorage.removeItem('dungNtUsername');
    localStorage.removeItem('dungNtPassword'); // Master password is user-specific
    
    // Keep GistID and Token if they are meant to be shared across users on the same device
    // localStorage.removeItem('dungNtGistId');
    // localStorage.removeItem('dungNtGithubToken');

    window.location.reload();
  }
}

function handleUpdateSettings(newSettings) {
  settings.masterPassword = newSettings.masterPassword;
  settings.gistId = newSettings.gistId;
  settings.githubToken = newSettings.githubToken;

  localStorage.setItem('dungNtPassword', newSettings.masterPassword);
  localStorage.setItem('dungNtGistId', newSettings.gistId);
  localStorage.setItem('dungNtGithubToken', newSettings.githubToken);
  
  showSettings.value = false;
  
  // If a user is selected, load their data with the new settings
  if (username.value) {
    loadData();
  }
}

function handleSaveItem(itemToSave) {
  if (itemToSave.id) {
    const index = items.value.findIndex(item => item.id === itemToSave.id);
    if (index !== -1) {
      items.value[index] = itemToSave;
    }
  } else {
    itemToSave.id = crypto.randomUUID();
    items.value.push(itemToSave);
  }
  showPasswordModal.value = false;
  saveData();
}

function handleDeleteItem(itemId) {
  if(confirm('Bạn có chắc chắn muốn xóa mật khẩu này không?')) {
    items.value = items.value.filter(item => item.id !== itemId);
    saveData();
  }
}

function openAddModal() {
  currentItemToEdit.value = null;
  showPasswordModal.value = true;
}

function openEditModal(item) {
  currentItemToEdit.value = item;
  showPasswordModal.value = true;
}
</script>

<template>
  <div>
    <div v-if="showUserPrompt" class="user-prompt-view card">
        <h2>Chọn người dùng</h2>
        <p>Nhập username để tải dữ liệu hoặc tạo một user mới.</p>
        <form @submit.prevent="handleUserSelect" class="user-prompt-form">
          <input 
            type="text" 
            v-model="inputUsername" 
            placeholder="Nhập username..."
            required
          />
          <button type="submit" class="button-primary">Tiếp tục</button>
        </form>
        <div v-if="error" class="error-state-small">{{ error }}</div>
    </div>

    <div v-else>
      <header class="app-header">
        <h1>Password Manager</h1>
        <div class="header-actions">
          <button @click="toggleTheme" class="icon-button" :title="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`">
            {{ theme === 'light' ? '🌙' : '☀️' }}
          </button>
          <button @click="showSettings = true" class="icon-button" title="Settings">
            <img src="/icons/setting.png" alt="Settings" width="24" />
          </button>
          <button v-if="isReady" @click="openAddModal" class="icon-button" title="Thêm Mật khẩu">
            <img src="/icons/add.png" alt="Add" width="18" />
          </button>
        </div>
      </header>

      <main>
        <div v-if="isLoading" class="loading-state">Đang tải...</div>
        <div v-if="error && !showUserPrompt" class="error-state card">{{ error }}</div>

        <SettingsModal 
          v-if="showSettings" 
          :initial-settings="settings"
          :username="username"
          @close="showSettings = false"
          @save="handleUpdateSettings"
          @switch-user="handleSwitchUser"
        />

        <div v-if="!isReady && !isLoading && !showSettings && username" class="locked-view card">
          <h2>Ứng dụng chưa sẵn sàng</h2>
          <p v-if="!areSettingsComplete">Vui lòng vào phần cài đặt để cấu hình Master Password, Gist ID và Token.</p>
          <p v-else>Có lỗi xảy ra, vui lòng thử lại hoặc kiểm tra cài đặt.</p>
          <button @click="loadData" v-if="areSettingsComplete">Thử lại</button>
        </div>

        <div v-if="isReady" class="main-content">
          <PasswordList :items="groupedItems" @view="openEditModal" @delete="handleDeleteItem" />
        </div>
        
        <PasswordModal 
          v-if="showPasswordModal"
          :item-to-edit="currentItemToEdit"
          @close="showPasswordModal = false"
          @save="handleSaveItem"
        />
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
}

.app-header h1 {
  font-size: 1.75rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-button {
  background-color: var(--color-card);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.25rem;
  padding: 0;
  box-shadow: var(--shadow);
}
.icon-button:hover {
  background-color: var(--color-background);
  border-color: var(--color-text-accent);
}

.loading-state, .locked-view, .user-prompt-view {
  text-align: center;
  padding: 3rem 1rem;
}

.user-prompt-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 300px;
  margin: 1.5rem auto 0;
}

.error-state {
  text-align: center;
  color: #ef4444;
  border-color: #ef4444;
}

.error-state-small {
  text-align: center;
  color: #ef4444;
  margin-top: 1rem;
  font-size: 0.9rem;
}

.main-content {
  margin-top: 2rem;
}
</style>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { GistService } from './services/gistService.js';
import { encrypt, decrypt, deriveAuthProof } from './crypto/crypto.js';
import { useTheme } from './composables/useTheme.js';

// --- Config ---
import { githubConfig } from './config.js'; // Synchronous import
let gistServiceInstance = null;
const configError = ref(null);

// Initialize gistService and check for config errors immediately
if (githubConfig.error) {
  configError.value = githubConfig.error;
} else {
  try {
    gistServiceInstance = new GistService();
  } catch (e) {
    // This catch is mostly for GistService constructor errors
    configError.value = e.message;
  }
}

// --- Components ---
import PasswordList from './components/PasswordList.vue';
import PasswordModal from './components/PasswordModal.vue';
import SettingsModal from './components/SettingsModal.vue';

// --- Theme ---
const { theme, toggleTheme } = useTheme();

// --- Reactive State ---
const settings = reactive({
  masterPassword: '',
});

// User-related state
const username = ref('');
const inputUsername = ref('');
const showUserPrompt = ref(false);

const items = ref([]); // Decrypted password items
const authProof = ref(null); // FIX #2: chứng minh biết master password (giữ trong RAM)
const isLoading = ref(false);
const error = ref(null);
const isLocked = ref(true);
const showSettings = ref(false);
const showPasswordModal = ref(false);
const currentItemToEdit = ref(null);

// --- Computed Properties ---
const isMasterPasswordSet = computed(() => !!settings.masterPassword);

const isReady = computed(() => {
  return !configError.value && username.value && isMasterPasswordSet.value && !isLocked.value && gistServiceInstance;
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


// --- Core Logic ---
async function loadData() {
  if (configError.value) {
    error.value = configError.value;
    return;
  }
  if (!isMasterPasswordSet.value || !username.value || !gistServiceInstance) {
    error.value = "Master Password hoặc thông tin người dùng chưa hoàn tất.";
    if (!isMasterPasswordSet.value) showSettings.value = true;
    if (!username.value) showUserPrompt.value = true;
    return;
  }

  isLoading.value = true;
  error.value = null;
  
  try {
    // FIX #2: lấy salt từ server, tính authProof, rồi đọc dữ liệu kèm proof.
    const authSalt = await gistServiceInstance.getAuthSalt(username.value);
    authProof.value = await deriveAuthProof(settings.masterPassword, authSalt);

    const { payload, authFailed, legacy } = await gistServiceInstance.fetchUserData(username.value, authProof.value);

    if (authFailed) {
      // Tài khoản mới (chưa có dữ liệu) HOẶC sai master password.
      // Mở khóa với kho rỗng; nếu sai mật khẩu cho tài khoản đã tồn tại,
      // thao tác lưu sau đó sẽ bị server từ chối (401) nên dữ liệu không mất.
      items.value = [];
      isLocked.value = false;
    } else if (payload) {
      const decryptedData = await decrypt(payload, settings.masterPassword);
      items.value = decryptedData.items || [];
      isLocked.value = false;
      // FIX #2 (migration): file v1 chưa có verifier -> lưu lại ngay để nâng cấp v2.
      if (legacy) {
        await saveData();
      }
    } else {
      items.value = [];
      isLocked.value = false;
    }
  } catch (e) {
    error.value = `Không thể tải dữ liệu: ${e.message}`;
    isLocked.value = true;
  } finally {
    isLoading.value = false;
  }
}

async function saveData() {
  if (isLocked.value || !gistServiceInstance) {
    error.value = "Ứng dụng đang bị khóa hoặc chưa được cấu hình. Không thể lưu.";
    return;
  }
  if (!username.value) {
    error.value = "Không có người dùng nào được chọn. Không thể lưu.";
    return;
  }

  isLoading.value = true;
  error.value = null;
  
  try {
    if (!authProof.value) {
      const authSalt = await gistServiceInstance.getAuthSalt(username.value);
      authProof.value = await deriveAuthProof(settings.masterPassword, authSalt);
    }
    const dataToEncrypt = { items: items.value };
    const encryptedPayload = await encrypt(dataToEncrypt, settings.masterPassword);
    await gistServiceInstance.updateUserData(username.value, authProof.value, encryptedPayload);
  } catch (e) {
    if (e.message === 'AUTH_FAILED') {
      error.value = 'Sai Master Password cho tài khoản này. Dữ liệu trên máy chủ không bị thay đổi.';
      isLocked.value = true;
    } else {
      error.value = `Lỗi khi lưu dữ liệu: ${e.message}`;
    }
  } finally {
    isLoading.value = false;
  }
}

// --- Lifecycle Hooks ---
onMounted(() => {
  if (configError.value) {
    return; // Stop execution if config is invalid
  }

  // FIX #3: KHÔNG đọc master password từ localStorage nữa (không còn lưu).
  // Master password chỉ tồn tại trong RAM, phải nhập lại mỗi phiên.
  const savedUsername = localStorage.getItem('dungNtUsername');

  if (savedUsername) {
    username.value = savedUsername;
    showSettings.value = true; // Luôn yêu cầu nhập lại master password
  } else {
    showUserPrompt.value = true; // Prompt for username
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

  if (isMasterPasswordSet.value) {
    loadData();
  } else {
    showSettings.value = true;
  }
}

function handleSwitchUser() {
  if (confirm('Bạn có chắc muốn đổi người dùng?')) {
    localStorage.removeItem('dungNtUsername');
    settings.masterPassword = '';
    authProof.value = null;
    window.location.reload();
  }
}

function handleUpdateSettings(newSettings) {
  // FIX #3: chỉ giữ trong RAM, KHÔNG lưu vào localStorage.
  settings.masterPassword = newSettings.masterPassword;
  authProof.value = null; // buộc dẫn xuất lại proof với mật khẩu mới nhập

  showSettings.value = false;

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
    <div v-if="configError" class="critical-error-view card">
      <h2>Lỗi Cấu hình</h2>
      <p>Không thể khởi động ứng dụng. Vui lòng kiểm tra lỗi sau:</p>
      <pre>{{ configError }}</pre>
      <p>Hãy chắc chắn rằng bạn đã tạo file <code>.env.local</code> và điền đầy đủ các biến môi trường, hoặc đã cấu hình chúng trên Vercel.</p>
    </div>

    <div v-else-if="showUserPrompt" class="user-prompt-view card">
        <h2>Chọn người dùng</h2>
        <p>Nhập username để tải dữ liệu hoặc tạo một user mới.</p>
        <form @submit.prevent="handleUserSelect" class="user-prompt-form">
          <input
            type="text"
            name="username"
            autocomplete="username"
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
          <p v-if="!isMasterPasswordSet">Vui lòng vào phần cài đặt để cấu hình Master Password.</p>
          <p v-else>Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.</p>
          <button @click="loadData" v-if="isMasterPasswordSet">Thử lại</button>
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

.loading-state, .locked-view, .user-prompt-view, .critical-error-view {
  text-align: center;
  padding: 3rem 1rem;
}

.critical-error-view {
  color: #ef4444;
  border: 1px solid #ef4444;
}
.critical-error-view pre {
  background-color: var(--color-background-soft);
  padding: 1rem;
  border-radius: var(--border-radius);
  text-align: left;
  white-space: pre-wrap;
  word-break: break-all;
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

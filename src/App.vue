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

const sortedItems = computed(() => {
  // Create a shallow copy to avoid mutating the original array
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
    isLocked.value = true;
  }
}

// --- Core Logic ---
async function loadData() {
  if (!areSettingsComplete.value) {
    error.value = "Cài đặt chưa hoàn tất. Vui lòng cung cấp Master Password, Gist ID, và GitHub Token.";
    showSettings.value = true;
    return;
  }

  isLoading.value = true;
  error.value = null;
  
  try {
    initializeService();
    const encryptedPayload = await gistService.fetchData();

    if (encryptedPayload) {
      const decryptedData = await decrypt(encryptedPayload, settings.masterPassword);
      items.value = decryptedData.items || [];
    } else {
      items.value = [];
    }
    isLocked.value = false;
  } catch (e) {
    error.value = `Không thể tải dữ liệu: ${e.message}`;
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

  isLoading.value = true;
  error.value = null;
  
  try {
    const dataToEncrypt = { items: items.value };
    const encryptedPayload = await encrypt(dataToEncrypt, settings.masterPassword);
    await gistService.updateData(encryptedPayload);
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

  if (areSettingsComplete.value) {
    loadData();
  } else {
    showSettings.value = true;
  }
});

// --- Event Handlers ---
function handleUpdateSettings(newSettings) {
  settings.masterPassword = newSettings.masterPassword;
  settings.gistId = newSettings.gistId;
  settings.githubToken = newSettings.githubToken;

  localStorage.setItem('dungNtPassword', newSettings.masterPassword);
  localStorage.setItem('dungNtGistId', newSettings.gistId);
  localStorage.setItem('dungNtGithubToken', newSettings.githubToken);
  
  showSettings.value = false;
  loadData();
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

function lockApp() {
  items.value = [];
  isLocked.value = true;
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
    <header class="app-header">
      <h1>Password Manager</h1>
      <div class="header-actions">
        <button @click="toggleTheme" class="icon-button" :title="`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`">
          {{ theme === 'light' ? '🌙' : '☀️' }}
        </button>
        <button @click="showSettings = true" class="icon-button" title="Settings">⚙️</button>
        <button v-if="!isLocked" @click="lockApp" class="icon-button" title="Lock">🔒</button>
        <button v-if="isLocked && areSettingsComplete" @click="loadData" class="icon-button" title="Unlock">🔓</button>
      </div>
    </header>

    <main>
      <div v-if="isLoading" class="loading-state">Đang tải...</div>
      <div v-if="error" class="error-state card">{{ error }}</div>

      <SettingsModal 
        v-if="showSettings" 
        :initial-settings="settings"
        @close="showSettings = false"
        @save="handleUpdateSettings"
      />

      <div v-if="isLocked && !showSettings" class="locked-view card">
        <h2>Ứng dụng đã bị khóa</h2>
        <p v-if="!areSettingsComplete">Vui lòng vào phần cài đặt để cấu hình.</p>
        <p v-else>Nhấn nút Mở khóa 🔓 để giải mã dữ liệu.</p>
      </div>

      <div v-if="!isLocked && !isLoading" class="main-content">
        <PasswordList :items="groupedItems" @view="openEditModal" @delete="handleDeleteItem" />
        <button @click="openAddModal" class="button-primary add-button">Thêm Mật khẩu</button>
      </div>
      
      <PasswordModal 
        v-if="showPasswordModal"
        :item-to-edit="currentItemToEdit"
        @close="showPasswordModal = false"
        @save="handleSaveItem"
      />
    </main>
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

.loading-state, .locked-view {
  text-align: center;
  padding: 3rem 1rem;
}

.error-state {
  text-align: center;
  color: #ef4444;
  border-color: #ef4444;
}

.main-content {
  margin-top: 2rem;
}

.add-button {
  display: block;
  width: 100%;
  margin-top: 1.5rem;
  font-size: 1rem;
}
</style>

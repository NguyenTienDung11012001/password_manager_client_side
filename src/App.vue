<script setup>
import { ref, onMounted, reactive, computed } from 'vue';
import { GistService } from './services/gistService.js';
import { encrypt, decrypt } from './crypto/crypto.js';

// --- Components ---
import PasswordList from './components/PasswordList.vue';
import PasswordModal from './components/PasswordModal.vue';
import SettingsModal from './components/SettingsModal.vue';

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
    // Update existing item
    const index = items.value.findIndex(item => item.id === itemToSave.id);
    if (index !== -1) {
      items.value[index] = itemToSave;
    }
  } else {
    // Add new item
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
  <div class="app-container">
    <header>
      <h1>Password Manager</h1>
      <div class="actions">
        <button @click="showSettings = true" title="Settings">⚙️</button>
        <button v-if="!isLocked" @click="lockApp" title="Lock">🔒</button>
        <button v-if="isLocked && areSettingsComplete" @click="loadData" title="Unlock">🔓</button>
      </div>
    </header>

    <main>
      <div v-if="isLoading" class="loading">Đang tải...</div>
      <div v-if="error" class="error-message">{{ error }}</div>

      <SettingsModal 
        v-if="showSettings" 
        :initial-settings="settings"
        @close="showSettings = false"
        @save="handleUpdateSettings"
      />

      <div v-if="isLocked && !showSettings" class="locked-view">
        <h2>Ứng dụng đã bị khóa</h2>
        <p v-if="!areSettingsComplete">Vui lòng vào phần cài đặt để cấu hình.</p>
        <p v-else>Nhấn nút Mở khóa 🔓 để giải mã dữ liệu.</p>
      </div>

      <div v-if="!isLocked && !isLoading" class="main-content">
        <PasswordList :items="items" @view="openEditModal" @delete="handleDeleteItem" />
        <button @click="openAddModal" class="add-button">Thêm Mật khẩu</button>
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

<style>
/* Basic styles for layout and feedback */
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  background-color: #242424;
  color: rgba(255, 255, 255, 0.87);
}
.app-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}
.actions button {
  margin-left: 0.5rem;
  background: none;
  border: 1px solid #555;
  color: white;
  padding: 0.5rem;
  border-radius: 5px;
  cursor: pointer;
}
.loading, .error-message, .locked-view {
  text-align: center;
  padding: 2rem;
  border: 1px dashed #555;
  border-radius: 8px;
  margin-top: 2rem;
}
.error-message {
  color: #ff6b6b;
  border-color: #ff6b6b;
}
.main-content {
  margin-top: 2rem;
}
.add-button {
  display: block;
  width: 100%;
  padding: 1rem;
  margin-top: 1.5rem;
  background-color: #42b983;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1.1rem;
}
</style>

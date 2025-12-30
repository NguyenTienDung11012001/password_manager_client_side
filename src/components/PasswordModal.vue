<script setup>
import { ref, watchEffect } from 'vue';

const props = defineProps({
  itemToEdit: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'save']);

const localItem = ref({});
const showPassword = ref(false);
const copyFeedback = ref('');

watchEffect(() => {
  if (props.itemToEdit) {
    localItem.value = { ...props.itemToEdit };
  } else {
    localItem.value = { app: '', username: '', password: '', note: '' };
  }
});

const formTitle = props.itemToEdit ? 'Chỉnh sửa Mật khẩu' : 'Thêm Mật khẩu mới';

function saveItem() {
  if (!localItem.value.app || !localItem.value.username || !localItem.value.password) {
    alert('Vui lòng điền App, Username, và Password.');
    return;
  }
  emit('save', localItem.value);
  emit('close');
}

async function copyToClipboard(text, fieldName) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    copyFeedback.value = `Đã sao chép ${fieldName}!`;
    setTimeout(() => {
      copyFeedback.value = '';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy: ', err);
    copyFeedback.value = 'Lỗi khi sao chép.';
    setTimeout(() => {
      copyFeedback.value = '';
    }, 2000);
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="card modal-content">
      <h2>{{ formTitle }}</h2>
      
      <form @submit.prevent="saveItem">
        <div class="form-group">
          <label for="app">App / Website</label>
          <input id="app" type="text" v-model.trim="localItem.app" required>
        </div>

        <div class="form-group">
          <label for="username">Username / Email</label>
          <div class="input-wrapper">
            <input id="username" type="text" v-model.trim="localItem.username" required>
            <button type="button" @click="copyToClipboard(localItem.username, 'username')" class="icon-button" title="Copy username">
              <img src="/icons/copy.png" alt="Copy" width="20">
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="input-wrapper">
            <input id="password" :type="showPassword ? 'text' : 'password'" v-model="localItem.password" required>
            <button type="button" @click="showPassword = !showPassword" class="icon-button toggle-vis-btn" title="Show/hide password">
              <img :src="showPassword ? '/icons/visual.png' : '/icons/hide.png'" alt="Toggle visibility" width="24">
            </button>
            <button type="button" @click="copyToClipboard(localItem.password, 'password')" class="icon-button copy-btn-pass" title="Copy password">
              <img src="/icons/copy.png" alt="Copy" width="20">
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="note">Ghi chú (Tùy chọn)</label>
          <textarea id="note" v-model.trim="localItem.note"></textarea>
        </div>

        <div class="modal-actions">
          <span v-if="copyFeedback" class="copy-feedback">{{ copyFeedback }}</span>
          <button type="button" @click="$emit('close')" class="button-secondary">Hủy</button>
          <button type="submit" class="button-primary">Lưu</button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  width: 90%;
  max-width: 500px;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 2rem;
  font-size: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper input {
  padding-right: 3rem; /* Space for one button */
}

/* More space for two buttons in password field */
#password {
  padding-right: 6rem;
}

.icon-button {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  height: 100%;
  width: 2.8rem;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.icon-button:hover {
  color: var(--color-text-primary);
}

.toggle-vis-btn {
  right: 2.8rem;
}

.copy-btn-pass {
  right: 0;
}

.input-wrapper #username + .icon-button {
  right: 0;
}


.modal-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 0.75rem;
  margin-top: 2rem;
}

.copy-feedback {
  color: var(--color-text-accent);
  margin-right: auto;
  font-size: 0.9rem;
}
</style>

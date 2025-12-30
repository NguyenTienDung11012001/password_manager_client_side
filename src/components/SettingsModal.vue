<script setup>
import { reactive, onMounted } from 'vue';

const props = defineProps({
  initialSettings: {
    type: Object,
    required: true,
  },
  username: {
    type: String,
    default: '',
  }
});

const emit = defineEmits(['close', 'save', 'switch-user']);

// Use a local reactive object for the form fields
const localSettings = reactive({ 
  masterPassword: ''
});

onMounted(() => {
  // Only sync the master password from props
  localSettings.masterPassword = props.initialSettings.masterPassword || '';
});


function saveSettings() {
  // Perform basic validation
  if (!localSettings.masterPassword) {
    alert('Vui lòng điền Master Password.');
    return;
  }
  // Only emit the master password
  emit('save', { masterPassword: localSettings.masterPassword });
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="card modal-content">
      <h2>Cài đặt</h2>
      
      <div v-if="username" class="user-info">
        <span>Đang đăng nhập với tư cách: <strong>{{ username }}</strong></span>
        <button @click="$emit('switch-user')" class="button-link">Đổi User</button>
      </div>

      <p class="subtitle">Mật khẩu chính (Master Password) sẽ được lưu vào localStorage trên trình duyệt của bạn.</p>
      
      <form @submit.prevent="saveSettings">
        <div class="form-group">
          <label for="masterPassword">Master Password</label>
          <input id="masterPassword" type="password" v-model.trim="localSettings.masterPassword" required>
          <small>Mật khẩu chính để mã hóa và giải mã dữ liệu của bạn. Mật khẩu này là duy nhất cho mỗi user.</small>
        </div>

        <div class="modal-actions">
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
  margin-bottom: 0.5rem;
  font-size: 1.5rem;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-background-soft);
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius);
  margin-bottom: 1rem;
  font-size: 0.9rem;
}

.button-link {
  background: none;
  border: none;
  color: var(--color-text-accent);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.subtitle {
  margin-top: 0;
  margin-bottom: 2rem;
  color: var(--color-text-secondary);
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

small {
  display: block;
  margin-top: 0.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
}
</style>

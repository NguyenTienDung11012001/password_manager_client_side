<script setup>
import { reactive } from 'vue';

const props = defineProps({
  initialSettings: {
    type: Object,
    required: true,
  }
});

const emit = defineEmits(['close', 'save']);

// Use a local reactive object for the form fields
const localSettings = reactive({ ...props.initialSettings });

function saveSettings() {
  // Perform basic validation
  if (!localSettings.masterPassword || !localSettings.gistId || !localSettings.githubToken) {
    alert('Vui lòng điền đầy đủ tất cả các trường.');
    return;
  }
  emit('save', { ...localSettings });
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>Cài đặt</h2>
      <p>Thông tin này sẽ được lưu vào localStorage trên trình duyệt của bạn.</p>
      
      <form @submit.prevent="saveSettings">
        <div class="form-group">
          <label for="masterPassword">Master Password</label>
          <input id="masterPassword" type="password" v-model.trim="localSettings.masterPassword" required>
          <small>Mật khẩu chính để mã hóa và giải mã dữ liệu của bạn.</small>
        </div>

        <div class="form-group">
          <label for="gistId">Gist ID</label>
          <input id="gistId" type="text" v-model.trim="localSettings.gistId" required>
          <small>ID của Gist riêng tư trên GitHub (phần cuối của URL).</small>
        </div>

        <div class="form-group">
          <label for="githubToken">GitHub Personal Access Token</label>
          <input id="githubToken" type="password" v-model.trim="localSettings.githubToken" required>
          <small>Token có quyền truy cập vào Gist của bạn.</small>
        </div>

        <div class="modal-actions">
          <button type="button" @click="$emit('close')">Hủy</button>
          <button type="submit">Lưu</button>
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
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}

.modal-content {
  background-color: #2f2f2f;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #555;
  border-radius: 4px;
  background-color: #333;
  color: white;
  box-sizing: border-box;
}

small {
  display: block;
  margin-top: 0.5rem;
  color: #aaa;
}

.modal-actions {
  text-align: right;
  margin-top: 2rem;
}

.modal-actions button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  margin-left: 1rem;
}

.modal-actions button[type="button"] {
  background-color: #555;
  color: white;
}

.modal-actions button[type="submit"] {
  background-color: #42b983;
  color: white;
}
</style>

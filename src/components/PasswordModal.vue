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

// Watch for changes in the prop and update the local state
// watchEffect will run initially and whenever its dependencies change
watchEffect(() => {
  if (props.itemToEdit) {
    // Editing an existing item, create a copy to avoid mutating the prop
    localItem.value = { ...props.itemToEdit };
  } else {
    // Adding a new item, start with a blank object
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
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>{{ formTitle }}</h2>
      
      <form @submit.prevent="saveItem">
        <div class="form-group">
          <label for="app">App / Website</label>
          <input id="app" type="text" v-model.trim="localItem.app" required>
        </div>

        <div class="form-group">
          <label for="username">Username / Email</label>
          <input id="username" type="text" v-model.trim="localItem.username" required>
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <div class="password-wrapper">
            <input id="password" :type="showPassword ? 'text' : 'password'" v-model="localItem.password" required>
            <button type="button" @click="showPassword = !showPassword" class="toggle-vis">
              {{ showPassword ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="note">Ghi chú (Tùy chọn)</label>
          <textarea id="note" v-model.trim="localItem.note"></textarea>
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
/* Reusing most styles from SettingsModal, but with some specifics */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex; justify-content: center; align-items: center; z-index: 100;
}
.modal-content {
  background-color: #2f2f2f; padding: 2rem; border-radius: 8px;
  width: 90%; max-width: 500px;
}
.form-group { margin-bottom: 1.5rem; }
label { display: block; margin-bottom: 0.5rem; }
input, textarea {
  width: 100%; padding: 0.75rem; border: 1px solid #555; border-radius: 4px;
  background-color: #333; color: white; box-sizing: border-box;
}
textarea {
  min-height: 80px;
  font-family: inherit;
}
.password-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.password-wrapper input {
  padding-right: 3rem; /* space for the button */
}
.toggle-vis {
  position: absolute;
  right: 1px;
  top: 1px;
  bottom: 1px;
  border: none;
  background: #444;
  padding: 0 1rem;
  cursor: pointer;
  border-radius: 0 4px 4px 0;
}
.modal-actions { text-align: right; margin-top: 2rem; }
.modal-actions button {
  padding: 0.75rem 1.5rem; border: none; border-radius: 5px; cursor: pointer; margin-left: 1rem;
}
.modal-actions button[type="button"] { background-color: #555; color: white; }
.modal-actions button[type="submit"] { background-color: #42b983; color: white; }
</style>

<script setup>
defineProps({
  items: {
    type: Array,
    required: true,
  }
});

defineEmits(['view', 'delete']);
</script>

<template>
  <div class="password-list-container">
    <div v-if="!items.length" class="empty-state">
      <p>Chưa có mật khẩu nào.</p>
      <p>Hãy nhấn nút "Thêm Mật khẩu" để bắt đầu.</p>
    </div>
    <ul v-else class="password-list">
      <li v-for="item in items" :key="item.id" class="password-item">
        <div class="item-info" @click="$emit('view', item)">
          <span class="app-name">{{ item.app }}</span>
          <span class="username">{{ item.username }}</span>
        </div>
        <div class="item-actions">
          <button @click="$emit('delete', item.id)" title="Delete"><img src="/icons/delete-icon.png" width="24" alt="Delete"></button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem;
  border: 1px dashed #555;
  border-radius: 8px;
  margin-top: 1rem;
}

.password-list {
  list-style-type: none;
  padding: 0;
  margin-top: 1rem;
}

.password-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background-color: #2f2f2f;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s;
}

.item-info {
  cursor: pointer;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.app-name {
  font-weight: bold;
  font-size: 1.1rem;
}

.username {
  color: #aaa;
  font-size: 0.9rem;
  margin-top: 4px;
}

.item-actions button {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2rem;
  margin-left: 0.75rem;
  opacity: 1;
  transition: opacity 0.2s;
}

.item-actions button:hover {
  opacity: 1;
}
</style>

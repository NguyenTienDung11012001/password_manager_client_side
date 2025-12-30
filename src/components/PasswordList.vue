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
  <div>
    <div v-if="!items.length" class="card empty-state">
      <p>Chưa có mật khẩu nào.</p>
      <p>Hãy nhấn nút "Thêm Mật khẩu" để bắt đầu.</p>
    </div>
    <div v-else class="list-container">
      <div v-for="item in items" :key="item.id" class="card list-item" @click="$emit('view', item)">
        <div class="item-info">
          <span class="app-name">{{ item.app }}</span>
          <span class="username">{{ item.username }}</span>
        </div>
        <div class="item-actions">
          <button @click.stop="$emit('delete', item.id)" class="delete-button" title="Delete">
            <img src="/icons/trash.png" alt="Delete" width="24">
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary);
}

.list-container {
  display: grid;
  gap: 1rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem; /* Thêm chút padding cho card */
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.list-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.app-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--color-text-primary);
}

.username {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.item-actions .delete-button {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 1.25rem;
  padding: 0.5rem;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 1;
}

.item-actions .delete-button:hover {
  background-color: var(--color-background);
  opacity: 1;
}
</style>

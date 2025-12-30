<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  items: {
    type: Object, // Now receives an object of grouped items
    required: true,
  }
});

defineEmits(['view', 'delete']);

const collapsedGroups = ref(new Set());

function toggleGroup(groupKey) {
  if (collapsedGroups.value.has(groupKey)) {
    collapsedGroups.value.delete(groupKey);
  } else {
    collapsedGroups.value.add(groupKey);
  }
}

const hasItems = computed(() => {
  return Object.keys(props.items).length > 0;
});
</script>

<template>
  <div>
    <div v-if="!hasItems" class="card empty-state">
      <p>Chưa có mật khẩu nào.</p>
      <p>Hãy nhấn nút "Thêm Mật khẩu" để bắt đầu.</p>
    </div>
    <div v-else class="groups-container">
      <div v-for="(groupItems, groupKey) in items" :key="groupKey" class="group-section">
        <div class="group-header" @click="toggleGroup(groupKey)">
          <h3>{{ groupKey }}</h3>
          <span class="collapse-icon">{{ collapsedGroups.has(groupKey) ? '▶' : '▼' }}</span>
        </div>
        
        <div v-if="!collapsedGroups.has(groupKey)" class="list-container">
          <div v-for="item in groupItems" :key="item.id" class="card list-item" @click="$emit('view', item)">
            <div class="item-info">
              <span class="app-name">{{ item.app }}</span>
              <span class="username">{{ item.username }}</span>
            </div>
            <div class="item-actions">
              <button @click.stop="$emit('delete', item.id)" class="delete-button" title="Delete">
                <img src="/icons/trash.png" alt="Delete" width="20">
              </button>
            </div>
          </div>
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

.groups-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.group-header {
  position: sticky;
  top: 0;
  background-color: var(--color-background);
  padding: 0.5rem 0;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--color-border);
  z-index: 10;
}

.group-header h3 {
  margin: 0;
  font-size: 1.25rem;
  color: var(--color-text-primary);
}

.collapse-icon {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.list-container {
  display: grid;
  gap: 1rem;
  padding-top: 1rem;
}

.list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.list-item:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow);
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
  opacity: 0.8;
  transition: all 0.2s ease;
}

.item-actions .delete-button:hover {
  background-color: var(--color-background);
  opacity: 1;
}

.item-actions .delete-button img {
  width: 20px;
  height: 20px;
}
</style>

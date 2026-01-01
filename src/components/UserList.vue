<script setup>
import { computed } from 'vue'

const props = defineProps({
  users: {
    type: Array,
    default: () => []
  },
  currentUserId: {
    type: String,
    default: null
  },
  voiceActive: {
    type: Boolean,
    default: false
  },
  voiceChat: {
    type: Object,
    default: null
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['kick-user'])

const sortedUsers = computed(() => {
  // Put current user first
  return [...props.users].sort((a, b) => {
    if (a.id === props.currentUserId) return -1
    if (b.id === props.currentUserId) return 1
    return a.joinedAt - b.joinedAt
  })
})

const isConnected = (userId) => {
  if (!props.voiceChat || !props.voiceActive) return false
  if (userId === props.currentUserId) return props.voiceChat.isConnected?.value
  return props.voiceChat.peers?.value?.[userId]?.connected
}

const getAvatarColor = (index) => {
  const colors = [
    'linear-gradient(135deg, #00fff7, #0099ff)',
    'linear-gradient(135deg, #ff0080, #ff6b35)',
    'linear-gradient(135deg, #8b5cf6, #ec4899)',
    'linear-gradient(135deg, #39ff14, #00d4aa)'
  ]
  return colors[index % colors.length]
}

const handleKick = (user) => {
  if (confirm(`Kick ${user.username} from the room?`)) {
    emit('kick-user', user)
  }
}
</script>

<template>
  <div class="user-list">
    <div class="user-list__header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>Players</span>
      <span class="user-list__count">{{ users.length }}/4</span>
    </div>

    <div class="user-list__users">
      <div
        v-for="(user, index) in sortedUsers"
        :key="user.id"
        class="user-item"
        :class="{
          'user-item--current': user.id === currentUserId,
          'user-item--connected': isConnected(user.id)
        }"
      >
        <div
          class="user-item__avatar"
          :style="{ background: getAvatarColor(index) }"
        >
          {{ user.username.charAt(0).toUpperCase() }}
          <div v-if="voiceActive && isConnected(user.id)" class="user-item__voice-indicator">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
              <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
            </svg>
          </div>
        </div>

        <div class="user-item__info">
          <span class="user-item__name">
            {{ user.username }}
            <span v-if="user.id === currentUserId" class="user-item__you">(you)</span>
          </span>
          <span class="user-item__status">
            <template v-if="voiceActive">
              {{ isConnected(user.id) ? 'Voice connected' : 'Connecting...' }}
            </template>
            <template v-else>
              In room
            </template>
          </span>
        </div>

        <!-- Admin Kick Button -->
        <button
          v-if="isAdmin && user.id !== currentUserId"
          class="user-item__kick"
          @click="handleKick(user)"
          title="Kick user"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>

      <!-- Empty slots -->
      <div
        v-for="i in (4 - users.length)"
        :key="'empty-' + i"
        class="user-item user-item--empty"
      >
        <div class="user-item__avatar user-item__avatar--empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="8" r="4"/>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          </svg>
        </div>
        <div class="user-item__info">
          <span class="user-item__name user-item__name--empty">Empty slot</span>
          <span class="user-item__status">Waiting for player...</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-list {
  padding: 1rem;
  flex: 1;
}

.user-list__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  color: var(--text-muted);
  font-family: var(--font-display);
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.user-list__header svg {
  width: 16px;
  height: 16px;
}

.user-list__count {
  margin-left: auto;
  padding: 0.2rem 0.5rem;
  background: var(--void-lighter);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.user-list__users {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--void);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.user-item--current {
  border-color: var(--neon-cyan);
  background: rgba(0, 255, 247, 0.05);
}

.user-item--connected {
  border-color: var(--neon-green);
}

.user-item--empty {
  opacity: 0.4;
  border-style: dashed;
}

.user-item__avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 1rem;
  color: white;
  flex-shrink: 0;
}

.user-item__avatar--empty {
  background: var(--void-lighter) !important;
  color: var(--text-muted);
}

.user-item__avatar--empty svg {
  width: 20px;
  height: 20px;
}

.user-item__voice-indicator {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 18px;
  height: 18px;
  background: var(--neon-green);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--void);
  box-shadow: 0 0 10px var(--neon-green);
  animation: pulse-glow 2s ease-in-out infinite;
}

.user-item__voice-indicator svg {
  width: 10px;
  height: 10px;
}

.user-item__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-item__name {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-item__name--empty {
  color: var(--text-muted);
  font-weight: 400;
}

.user-item__you {
  color: var(--neon-cyan);
  font-size: 0.8rem;
  font-weight: 400;
}

.user-item__status {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
}

.user-item__kick {
  margin-left: auto;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 0, 128, 0.1);
  border: 1px solid rgba(255, 0, 128, 0.3);
  border-radius: 8px;
  color: var(--neon-pink);
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.user-item__kick:hover {
  background: rgba(255, 0, 128, 0.2);
  border-color: var(--neon-pink);
  transform: scale(1.05);
  box-shadow: 0 0 15px rgba(255, 0, 128, 0.3);
}

.user-item__kick svg {
  width: 16px;
  height: 16px;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 5px var(--neon-green);
  }
  50% {
    box-shadow: 0 0 15px var(--neon-green);
  }
}

/* Mobile */
@media (max-width: 768px) {
  .user-list {
    padding: 0.75rem;
  }

  .user-list__users {
    flex-direction: row;
    flex-wrap: nowrap;
    overflow-x: auto;
    gap: 0.75rem;
    padding-bottom: 0.5rem;
  }

  .user-item {
    flex-direction: column;
    min-width: 80px;
    text-align: center;
    padding: 0.5rem;
  }

  .user-item__info {
    align-items: center;
  }

  .user-item__name {
    font-size: 0.8rem;
  }

  .user-item__you {
    display: none;
  }
}
</style>

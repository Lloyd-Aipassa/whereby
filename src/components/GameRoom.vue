<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useGameroom } from '../composables/useGameroom'
import { useVoiceChat } from '../composables/useVoiceChat'
import UserList from './UserList.vue'
import VoiceControls from './VoiceControls.vue'
import ChatMessage from './ChatMessage.vue'

const props = defineProps({
  roomId: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['leave-room'])

const {
  currentRoom,
  messages,
  users,
  loading,
  error: roomError,
  joinRoom,
  leaveRoom,
  sendMessage
} = useGameroom()

const userId = ref(null)
const messageInput = ref('')
const chatContainer = ref(null)
const isVoiceActive = ref(false)

// Initialize voice chat composable (will be set up after joining)
let voiceChat = null

const roomName = computed(() => currentRoom.value?.name || 'Loading...')

const otherUsers = computed(() => {
  return users.value.filter(u => u.id !== userId.value)
})

// Join room on mount
onMounted(async () => {
  try {
    userId.value = await joinRoom(props.roomId, props.username)
  } catch (err) {
    console.error('Failed to join room:', err)
  }
})

// Initialize voice chat when userId is set
watch(userId, (newId) => {
  if (newId) {
    voiceChat = useVoiceChat(props.roomId, newId)
  }
})

// Watch for user changes to update peer connections
watch(users, (newUsers, oldUsers) => {
  if (!voiceChat || !isVoiceActive.value) return

  // Find new users
  const oldIds = new Set((oldUsers || []).map(u => u.id))
  const newUsersList = newUsers.filter(u => !oldIds.has(u.id) && u.id !== userId.value)

  // Handle new users joining
  for (const user of newUsersList) {
    voiceChat.handleUserJoined(user)
  }

  // Find users who left
  const newIds = new Set(newUsers.map(u => u.id))
  const leftUsers = (oldUsers || []).filter(u => !newIds.has(u.id))

  // Handle users leaving
  for (const user of leftUsers) {
    voiceChat.handleUserLeft(user.id)
  }
}, { deep: true })

// Auto-scroll chat
watch(messages, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}, { deep: true })

const handleSendMessage = async () => {
  if (!messageInput.value.trim() || !userId.value) return

  await sendMessage(props.roomId, userId.value, props.username, messageInput.value)
  messageInput.value = ''
}

const handleLeaveRoom = async () => {
  if (voiceChat) {
    await voiceChat.stopVoiceChat()
  }
  await leaveRoom(props.roomId, userId.value, props.username)
  emit('leave-room')
}

const handleToggleVoice = async () => {
  if (!voiceChat) return

  if (isVoiceActive.value) {
    await voiceChat.stopVoiceChat()
    isVoiceActive.value = false
  } else {
    try {
      await voiceChat.startVoiceChat(users.value)
      isVoiceActive.value = true
    } catch (err) {
      console.error('Failed to start voice chat:', err)
    }
  }
}

const handleToggleMute = () => {
  if (voiceChat) {
    voiceChat.toggleMute()
  }
}

// Cleanup on unmount
onUnmounted(async () => {
  if (voiceChat) {
    await voiceChat.stopVoiceChat()
  }
})
</script>

<template>
  <div class="gameroom">
    <!-- Header -->
    <header class="gameroom__header">
      <div class="gameroom__header-left">
        <button class="gameroom__back-btn" @click="handleLeaveRoom">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>
        <div class="gameroom__room-info">
          <h1 class="gameroom__room-name">{{ roomName }}</h1>
          <span class="gameroom__user-count">{{ users.length }} / 4 players</span>
        </div>
      </div>

      <div class="gameroom__header-right">
        <div class="gameroom__connection-status" :class="{ 'gameroom__connection-status--active': isVoiceActive }">
          <span class="gameroom__status-dot"></span>
          {{ isVoiceActive ? 'Voice Active' : 'Voice Off' }}
        </div>
      </div>
    </header>

    <div class="gameroom__content">
      <!-- Sidebar with users and voice controls -->
      <aside class="gameroom__sidebar">
        <UserList
          :users="users"
          :current-user-id="userId"
          :voice-active="isVoiceActive"
          :voice-chat="voiceChat"
        />

        <VoiceControls
          :is-active="isVoiceActive"
          :is-muted="voiceChat?.isMuted.value || false"
          :is-connecting="voiceChat?.isConnecting.value || false"
          :error="voiceChat?.error.value"
          :connected-peers="voiceChat?.connectedPeersCount.value || 0"
          @toggle-voice="handleToggleVoice"
          @toggle-mute="handleToggleMute"
        />
      </aside>

      <!-- Main chat area -->
      <main class="gameroom__main">
        <div class="gameroom__chat">
          <div
            ref="chatContainer"
            class="gameroom__messages"
          >
            <div v-if="messages.length === 0" class="gameroom__no-messages">
              <div class="gameroom__no-messages-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <p>No messages yet</p>
              <span>Start the conversation!</span>
            </div>

            <ChatMessage
              v-for="message in messages"
              :key="message.id"
              :message="message"
              :is-own="message.userId === userId"
            />
          </div>

          <form class="gameroom__input-area" @submit.prevent="handleSendMessage">
            <input
              v-model="messageInput"
              type="text"
              placeholder="Type a message..."
              maxlength="500"
              class="gameroom__input"
            />
            <button
              type="submit"
              class="gameroom__send-btn"
              :disabled="!messageInput.trim()"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>
        </div>
      </main>
    </div>

    <!-- Leave confirmation overlay -->
    <div v-if="loading" class="gameroom__loading-overlay">
      <div class="gameroom__spinner"></div>
    </div>
  </div>
</template>

<style scoped>
.gameroom {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
}

.gameroom__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: var(--glass-bg);
  border-bottom: 1px solid var(--glass-border);
  backdrop-filter: blur(10px);
}

.gameroom__header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.gameroom__back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--void-lighter);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.gameroom__back-btn:hover {
  background: var(--void-light);
  color: var(--neon-pink);
  border-color: var(--neon-pink);
}

.gameroom__back-btn svg {
  width: 20px;
  height: 20px;
}

.gameroom__room-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.gameroom__room-name {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.gameroom__user-count {
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.gameroom__header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.gameroom__connection-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--void-lighter);
  border-radius: 20px;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.gameroom__connection-status--active {
  background: rgba(57, 255, 20, 0.1);
  color: var(--neon-green);
}

.gameroom__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
}

.gameroom__connection-status--active .gameroom__status-dot {
  background: var(--neon-green);
  box-shadow: 0 0 10px var(--neon-green);
  animation: pulse 2s ease-in-out infinite;
}

.gameroom__content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.gameroom__sidebar {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--void-light);
  border-right: 1px solid var(--glass-border);
  overflow-y: auto;
}

.gameroom__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.gameroom__chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.gameroom__messages {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.gameroom__no-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
}

.gameroom__no-messages-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
  opacity: 0.3;
}

.gameroom__no-messages p {
  font-family: var(--font-display);
  font-size: 1.1rem;
  margin: 0 0 0.25rem;
}

.gameroom__no-messages span {
  font-size: 0.9rem;
  opacity: 0.7;
}

.gameroom__input-area {
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: var(--void-light);
  border-top: 1px solid var(--glass-border);
}

.gameroom__input {
  flex: 1;
  padding: 0.875rem 1.25rem;
  background: var(--void);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.gameroom__input:focus {
  outline: none;
  border-color: var(--neon-cyan);
  box-shadow: 0 0 15px rgba(0, 255, 247, 0.15);
}

.gameroom__input::placeholder {
  color: var(--text-muted);
  opacity: 0.5;
}

.gameroom__send-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  border: none;
  border-radius: 12px;
  color: var(--void);
  cursor: pointer;
  transition: all 0.2s ease;
}

.gameroom__send-btn:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 0 20px rgba(0, 255, 247, 0.4);
}

.gameroom__send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.gameroom__send-btn svg {
  width: 20px;
  height: 20px;
}

.gameroom__loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.gameroom__spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--void-lighter);
  border-top-color: var(--neon-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Mobile responsive */
@media (max-width: 768px) {
  .gameroom__content {
    flex-direction: column;
  }

  .gameroom__sidebar {
    width: 100%;
    max-height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--glass-border);
    flex-direction: row;
  }

  .gameroom__header {
    padding: 0.75rem 1rem;
  }

  .gameroom__room-name {
    font-size: 1rem;
  }

  .gameroom__connection-status {
    padding: 0.375rem 0.75rem;
    font-size: 0.7rem;
  }
}
</style>

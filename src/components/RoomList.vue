<script setup>
import { ref, onMounted } from 'vue'
import { useGameroom } from '../composables/useGameroom'
import { useAdmin } from '../composables/useAdmin'

const emit = defineEmits(['join-room'])

const { rooms, loading, error, subscribeToRooms, createRoom, isRoomFull, deleteRoom } = useGameroom()
const { isAdmin, adminName, loginError, login, logout } = useAdmin()

const showCreateModal = ref(false)
const showLoginModal = ref(false)
const newRoomName = ref('')
const username = ref('')
const joiningRoomId = ref(null)
const joinUsername = ref('')
const adminEmail = ref('')
const adminPassword = ref('')

onMounted(() => {
  subscribeToRooms()
})

const handleCreateRoom = async () => {
  if (!newRoomName.value.trim() || !username.value.trim()) return

  try {
    const { roomId, userId } = await createRoom(newRoomName.value.trim(), username.value.trim())
    showCreateModal.value = false
    emit('join-room', { roomId, username: username.value.trim(), userId })
    newRoomName.value = ''
    username.value = ''
  } catch (err) {
    console.error('Failed to create room:', err)
  }
}

const initiateJoin = (roomId) => {
  joiningRoomId.value = roomId
  joinUsername.value = ''
}

const handleJoinRoom = () => {
  if (!joinUsername.value.trim() || !joiningRoomId.value) return

  emit('join-room', {
    roomId: joiningRoomId.value,
    username: joinUsername.value.trim()
  })
  joiningRoomId.value = null
  joinUsername.value = ''
}

const cancelJoin = () => {
  joiningRoomId.value = null
  joinUsername.value = ''
}

const handleLogin = () => {
  if (login(adminEmail.value, adminPassword.value)) {
    showLoginModal.value = false
    adminEmail.value = ''
    adminPassword.value = ''
  }
}

const handleLogout = () => {
  logout()
}

const handleDeleteRoom = async (roomId) => {
  if (!isAdmin.value) return

  if (confirm('Are you sure you want to delete this room?')) {
    await deleteRoom(roomId)
  }
}
</script>

<template>
  <div class="room-list">
    <!-- Admin Controls Header -->
    <div class="room-list__top-bar">
      <div class="room-list__admin-controls">
        <!-- Not logged in: Show login button -->
        <button
          v-if="!isAdmin"
          class="room-list__admin-btn"
          @click="showLoginModal = true"
          title="Admin Login"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zM12 14a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9z"/>
          </svg>
        </button>

        <!-- Logged in: Show status and logout -->
        <div v-else class="room-list__admin-status">
          <div class="room-list__admin-badge">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2a5 5 0 1 0 5 5 5 5 0 0 0-5-5zM12 14a9 9 0 0 0-9 9h18a9 9 0 0 0-9-9z"/>
            </svg>
            <span>{{ adminName }} logged in</span>
          </div>
          <button
            class="room-list__logout-btn"
            @click="handleLogout"
            title="Logout"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div class="room-list__header">
      <div class="room-list__title-wrapper">
        <div class="room-list__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <h1 class="room-list__title">GAMEROOMS</h1>
      </div>
      <p class="room-list__subtitle">Join a room or create your own</p>
    </div>

    <button class="room-list__create-btn" @click="showCreateModal = true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Create Room
    </button>

    <div v-if="loading" class="room-list__loading">
      <div class="room-list__spinner"></div>
      <span>Loading rooms...</span>
    </div>

    <div v-else-if="error" class="room-list__error">
      {{ error }}
    </div>

    <div v-else-if="rooms.length === 0" class="room-list__empty">
      <div class="room-list__empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M9 9h6M9 12h6M9 15h4"/>
        </svg>
      </div>
      <p>No active rooms</p>
      <span>Be the first to create one!</span>
    </div>

    <div v-else class="room-list__grid-container">
      <div class="room-list__grid">
        <div
          v-for="room in rooms"
          :key="room.id"
          class="room-card"
          :class="{ 'room-card--full': isRoomFull(room) }"
        >
        <!-- Admin Delete Button -->
        <button
          v-if="isAdmin"
          class="room-card__delete"
          @click.stop="handleDeleteRoom(room.id)"
          title="Delete Room"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>

        <div class="room-card__header">
          <h3 class="room-card__name">{{ room.name }}</h3>
          <span
            class="room-card__status"
            :class="{ 'room-card__status--full': isRoomFull(room) }"
          >
            {{ isRoomFull(room) ? 'FULL' : 'OPEN' }}
          </span>
        </div>

        <div class="room-card__users">
          <div class="room-card__avatars">
            <div
              v-for="(user, index) in room.users?.slice(0, 4)"
              :key="user.id"
              class="room-card__avatar"
              :style="{ '--delay': index * 0.1 + 's' }"
              :title="user.username"
            >
              {{ user.username.charAt(0).toUpperCase() }}
            </div>
          </div>
          <span class="room-card__count">
            {{ room.users?.length || 0 }} / 4 players
          </span>
        </div>

        <button
          v-if="!isRoomFull(room)"
          class="room-card__join-btn"
          @click="initiateJoin(room.id)"
        >
          Join Room
        </button>
        <div v-else class="room-card__full-text">
          Room is full
        </div>
      </div>
      </div>
    </div>

    <!-- Create Room Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
        <div class="modal">
          <div class="modal__header">
            <h2>Create New Room</h2>
            <button class="modal__close" @click="showCreateModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal__body">
            <div class="input-group">
              <label>Room Name</label>
              <input
                v-model="newRoomName"
                type="text"
                placeholder="Enter room name..."
                maxlength="30"
                @keyup.enter="handleCreateRoom"
              />
            </div>

            <div class="input-group">
              <label>Your Username</label>
              <input
                v-model="username"
                type="text"
                placeholder="Enter your name..."
                maxlength="20"
                @keyup.enter="handleCreateRoom"
              />
            </div>
          </div>

          <div class="modal__footer">
            <button class="btn btn--secondary" @click="showCreateModal = false">
              Cancel
            </button>
            <button
              class="btn btn--primary"
              :disabled="!newRoomName.trim() || !username.trim()"
              @click="handleCreateRoom"
            >
              Create & Join
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Join Room Modal -->
    <Teleport to="body">
      <div v-if="joiningRoomId" class="modal-overlay" @click.self="cancelJoin">
        <div class="modal">
          <div class="modal__header">
            <h2>Join Room</h2>
            <button class="modal__close" @click="cancelJoin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal__body">
            <div class="input-group">
              <label>Your Username</label>
              <input
                v-model="joinUsername"
                type="text"
                placeholder="Enter your name..."
                maxlength="20"
                @keyup.enter="handleJoinRoom"
                autofocus
              />
            </div>
          </div>

          <div class="modal__footer">
            <button class="btn btn--secondary" @click="cancelJoin">
              Cancel
            </button>
            <button
              class="btn btn--primary"
              :disabled="!joinUsername.trim()"
              @click="handleJoinRoom"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Admin Login Modal -->
    <Teleport to="body">
      <div v-if="showLoginModal" class="modal-overlay" @click.self="showLoginModal = false">
        <div class="modal">
          <div class="modal__header">
            <h2>Admin Login</h2>
            <button class="modal__close" @click="showLoginModal = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal__body">
            <div v-if="loginError" class="login-error">
              {{ loginError }}
            </div>

            <div class="input-group">
              <label>Email</label>
              <input
                v-model="adminEmail"
                type="email"
                placeholder="Enter admin email..."
                @keyup.enter="handleLogin"
                autofocus
              />
            </div>

            <div class="input-group">
              <label>Password</label>
              <input
                v-model="adminPassword"
                type="password"
                placeholder="Enter password..."
                @keyup.enter="handleLogin"
              />
            </div>
          </div>

          <div class="modal__footer">
            <button class="btn btn--secondary" @click="showLoginModal = false">
              Cancel
            </button>
            <button
              class="btn btn--primary"
              :disabled="!adminEmail.trim() || !adminPassword.trim()"
              @click="handleLogin"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.room-list {
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  position: relative;
}

.room-list::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: url('/hero.jpeg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  opacity: var(--hero-opacity);
  z-index: -1;
  pointer-events: none;
}

.room-list__top-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 1.5rem;
}

.room-list__header {
  text-align: center;
  margin-bottom: 3rem;
}

.room-list__title-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.room-list__icon {
  width: 48px;
  height: 48px;
  color: var(--neon-cyan);
  animation: float 3s ease-in-out infinite;
}

.room-list__title {
  font-family: var(--font-display);
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: 0.2em;
  color: var(--neon-cyan);
  text-shadow: 0 0 20px rgba(0, 255, 247, 0.5);
  margin: 0;
}

.room-list__subtitle {
  font-family: var(--font-body);
  color: var(--text-muted);
  font-size: 1.1rem;
  margin: 0;
}

.room-list__admin-controls {
  display: flex;
  align-items: center;
}

.room-list__admin-btn {
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

.room-list__admin-btn:hover {
  background: var(--void-light);
  color: var(--neon-cyan);
  border-color: var(--neon-cyan);
  transform: translateY(-2px);
}

.room-list__admin-btn svg {
  width: 20px;
  height: 20px;
}

.room-list__admin-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-direction: row-reverse;
}

.room-list__admin-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: rgba(0, 255, 247, 0.1);
  border: 1px solid var(--neon-cyan);
  border-radius: 20px;
  color: var(--neon-cyan);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 500;
  box-shadow: 0 0 15px rgba(0, 255, 247, 0.2);
}

.room-list__admin-badge svg {
  width: 16px;
  height: 16px;
}

.room-list__logout-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 0, 128, 0.1);
  border: 1px solid rgba(255, 0, 128, 0.3);
  border-radius: 10px;
  color: var(--neon-pink);
  cursor: pointer;
  transition: all 0.2s ease;
}

.room-list__logout-btn:hover {
  background: rgba(255, 0, 128, 0.2);
  border-color: var(--neon-pink);
  transform: translateY(-2px);
  box-shadow: 0 0 15px rgba(255, 0, 128, 0.3);
}

.room-list__logout-btn svg {
  width: 18px;
  height: 18px;
}

.room-list__create-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
  padding: 1.25rem;
  margin-bottom: 2rem;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(255, 0, 128, 0.2));
  border: 2px dashed var(--neon-purple);
  border-radius: 12px;
  color: var(--neon-purple);
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.room-list__create-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(255, 0, 128, 0.3));
  border-style: solid;
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.3);
  transform: translateY(-2px);
}

.room-list__create-btn svg {
  width: 24px;
  height: 24px;
}

.room-list__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  color: var(--text-muted);
}

.room-list__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--void-lighter);
  border-top-color: var(--neon-cyan);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.room-list__error {
  padding: 1.5rem;
  background: rgba(255, 0, 128, 0.1);
  border: 1px solid var(--neon-pink);
  border-radius: 8px;
  color: var(--neon-pink);
  text-align: center;
}

.room-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;
  color: var(--text-muted);
}

.room-list__empty-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 1.5rem;
  opacity: 0.3;
}

.room-list__empty p {
  font-family: var(--font-display);
  font-size: 1.25rem;
  margin: 0 0 0.5rem;
}

.room-list__empty span {
  font-size: 0.9rem;
}

.room-list__grid-container {
  position: relative;
}

.room-list__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  position: relative;
  z-index: 2;
}

/* Room Card */
.room-card {
  background: var(--glass-bg);
  backdrop-filter: blur(10px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 1.5rem;
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease backwards;
  position: relative;
}

.room-card:nth-child(1) { animation-delay: 0s; }
.room-card:nth-child(2) { animation-delay: 0.1s; }
.room-card:nth-child(3) { animation-delay: 0.2s; }
.room-card:nth-child(4) { animation-delay: 0.3s; }

.room-card:hover {
  transform: translateY(-4px);
  border-color: var(--neon-cyan);
  box-shadow: 0 0 30px rgba(0, 255, 247, 0.15);
}

.room-card--full {
  opacity: 0.7;
}

.room-card--full:hover {
  transform: none;
  border-color: var(--glass-border);
  box-shadow: none;
}

.room-card__delete {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 0, 128, 0.8);
  border: 1px solid var(--neon-pink);
  border-radius: 8px;
  color: white;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
  z-index: 10;
}

.room-card:hover .room-card__delete {
  opacity: 1;
  transform: scale(1);
}

.room-card__delete:hover {
  background: var(--neon-pink);
  box-shadow: 0 0 20px rgba(255, 0, 128, 0.5);
  transform: scale(1.1);
}

.room-card__delete svg {
  width: 18px;
  height: 18px;
}

.room-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}

.room-card__name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  word-break: break-word;
}

.room-card__status {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  background: rgba(57, 255, 20, 0.15);
  color: var(--neon-green);
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.room-card__status--full {
  background: rgba(255, 0, 128, 0.15);
  color: var(--neon-pink);
}

.room-card__users {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
}

.room-card__avatars {
  display: flex;
  gap: -8px;
}

.room-card__avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--neon-purple), var(--neon-pink));
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9rem;
  color: white;
  border: 2px solid var(--void);
  margin-left: -8px;
  animation: popIn 0.3s ease backwards;
  animation-delay: var(--delay);
}

.room-card__avatar:first-child {
  margin-left: 0;
}

.room-card__count {
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--text-muted);
}

.room-card__join-btn {
  width: 100%;
  padding: 0.875rem;
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  border: none;
  border-radius: 8px;
  color: var(--void);
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.9rem;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.3s ease;
}

.room-card__join-btn:hover {
  transform: scale(1.02);
  box-shadow: 0 0 25px rgba(0, 255, 247, 0.4);
}

.room-card__full-text {
  text-align: center;
  padding: 0.875rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.modal {
  background: var(--void-light);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  width: 90%;
  max-width: 420px;
  animation: slideUp 0.3s ease;
}

.modal__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--glass-border);
}

.modal__header h2 {
  font-family: var(--font-display);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.modal__close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal__close:hover {
  background: var(--void-lighter);
  color: var(--text-primary);
}

.modal__close svg {
  width: 18px;
  height: 18px;
}

.modal__body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal__footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--glass-border);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-family: var(--font-body);
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
}

.input-group input {
  padding: 0.875rem 1rem;
  background: var(--void);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: 1rem;
  transition: all 0.2s ease;
}

.input-group input:focus {
  outline: none;
  border-color: var(--neon-cyan);
  box-shadow: 0 0 15px rgba(0, 255, 247, 0.2);
}

.input-group input::placeholder {
  color: var(--text-muted);
  opacity: 0.5;
}

.login-error {
  padding: 0.875rem;
  background: rgba(255, 0, 128, 0.1);
  border: 1px solid var(--neon-pink);
  border-radius: 8px;
  color: var(--neon-pink);
  font-size: 0.9rem;
  text-align: center;
}

.btn {
  flex: 1;
  padding: 0.875rem 1.5rem;
  border-radius: 8px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn--secondary {
  background: transparent;
  border: 1px solid var(--glass-border);
  color: var(--text-muted);
}

.btn--secondary:hover {
  background: var(--void-lighter);
  color: var(--text-primary);
}

.btn--primary {
  background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
  border: none;
  color: var(--void);
}

.btn--primary:hover:not(:disabled) {
  box-shadow: 0 0 25px rgba(0, 255, 247, 0.4);
  transform: translateY(-1px);
}

.btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes popIn {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@media (max-width: 640px) {
  .room-list {
    padding: 1rem;
  }

  .room-list__title {
    font-size: 1.75rem;
  }

  .room-list__icon {
    width: 36px;
    height: 36px;
  }
}
</style>

<script setup>
import { ref } from 'vue'
import RoomList from './components/RoomList.vue'
import GameRoom from './components/GameRoom.vue'

const currentView = ref('rooms') // 'rooms' | 'game'
const activeRoom = ref(null)
const activeUsername = ref('')
const activeUserId = ref(null)

const handleJoinRoom = ({ roomId, username, userId = null }) => {
  activeRoom.value = roomId
  activeUsername.value = username
  activeUserId.value = userId
  currentView.value = 'game'
}

const handleLeaveRoom = () => {
  activeRoom.value = null
  activeUsername.value = ''
  activeUserId.value = null
  currentView.value = 'rooms'
}
</script>

<template>
  <div class="app">
    <!-- Background effects -->
    <div class="app__bg">
      <div class="app__grid"></div>
      <div class="app__glow app__glow--1"></div>
      <div class="app__glow app__glow--2"></div>
      <div class="app__scanline"></div>
    </div>

    <!-- Main content -->
    <Transition name="fade" mode="out-in">
      <RoomList
        v-if="currentView === 'rooms'"
        key="rooms"
        @join-room="handleJoinRoom"
      />
      <GameRoom
        v-else
        key="game"
        :room-id="activeRoom"
        :username="activeUsername"
        :user-id="activeUserId"
        @leave-room="handleLeaveRoom"
      />
    </Transition>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.app__bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  overflow: hidden;
}

.app__grid {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(0, 255, 247, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 255, 247, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  mask-image: radial-gradient(ellipse at center, black 0%, transparent 70%);
}

.app__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3;
  animation: float 20s ease-in-out infinite;
}

.app__glow--1 {
  width: 600px;
  height: 600px;
  background: var(--neon-purple);
  top: -200px;
  right: -200px;
}

.app__glow--2 {
  width: 500px; 
  height: 500px;
  background: var(--neon-cyan);
  bottom: -150px;
  left: -150px;
  animation-delay: -10s;
}

.app__scanline {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(0, 255, 247, 0.1),
    rgba(0, 255, 247, 0.3),
    rgba(0, 255, 247, 0.1),
    transparent
  );
  animation: scanline 8s linear infinite;
  pointer-events: none;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  25% { transform: translate(30px, -30px) scale(1.05); }
  50% { transform: translate(-20px, 20px) scale(0.95); }
  75% { transform: translate(-30px, -20px) scale(1.02); }
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100vh); }
}

/* Page transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>

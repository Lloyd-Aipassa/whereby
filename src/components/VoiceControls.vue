<script setup>
defineProps({
  isActive: {
    type: Boolean,
    default: false,
  },
  isMuted: {
    type: Boolean,
    default: false,
  },
  isConnecting: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: null,
  },
  connectedPeers: {
    type: Number,
    default: 0,
  },
});

const emit = defineEmits(['toggle-voice', 'toggle-mute']);
</script>

<template>
  <div class="voice-controls">
    <div class="voice-controls__header">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
      </svg>
      <span>Voice Chat</span>
    </div>

    <div v-if="error" class="voice-controls__error">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <div class="voice-controls__status">
      <div class="voice-controls__status-item">
        <span class="voice-controls__label">Status</span>
        <span
          class="voice-controls__value"
          :class="{
            'voice-controls__value--active': isActive,
            'voice-controls__value--connecting': isConnecting,
          }">
          <span class="voice-controls__dot"></span>
          {{ isConnecting ? 'Connecting...' : isActive ? 'Active' : 'Inactive' }}
        </span>
      </div>

      <div v-if="isActive" class="voice-controls__status-item">
        <span class="voice-controls__label">Connected</span>
        <span class="voice-controls__value">
          {{ connectedPeers }} peer{{ connectedPeers !== 1 ? 's' : '' }}
        </span>
      </div>
    </div>

    <div class="voice-controls__buttons">
      <button
        class="voice-controls__btn"
        :class="{
          'voice-controls__btn--active': isActive,
          'voice-controls__btn--connecting': isConnecting,
        }"
        :disabled="isConnecting"
        @click="emit('toggle-voice')">
        <div class="voice-controls__btn-icon">
          <svg
            v-if="!isActive"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </div>
        <span>{{ isActive ? 'Leave Voice' : 'Join Voice' }}</span>
      </button>

      <button
        v-if="isActive"
        class="voice-controls__btn voice-controls__btn--mute"
        :class="{ 'voice-controls__btn--muted': isMuted }"
        @click="emit('toggle-mute')">
        <div class="voice-controls__btn-icon">
          <svg
            v-if="!isMuted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </div>
        <span>{{ isMuted ? 'Unmute' : 'Mute' }}</span>
      </button>
    </div>

    <div v-if="isActive && !isMuted" class="voice-controls__visualizer">
      <div
        class="voice-controls__bar"
        v-for="i in 5"
        :key="i"
        :style="{ '--delay': i * 0.1 + 's' }"></div>
    </div>
  </div>
</template>

<style scoped>
.voice-controls {
  padding: 1rem;
  border-top: 1px solid var(--glass-border);
}

.voice-controls__header {
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

.voice-controls__header svg {
  width: 16px;
  height: 16px;
}

.voice-controls__error {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
  background: rgba(255, 0, 128, 0.1);
  border: 1px solid var(--neon-pink);
  border-radius: 8px;
  color: var(--neon-pink);
  font-size: 0.8rem;
  line-height: 1.4;
}

.voice-controls__error svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}

.voice-controls__status {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.voice-controls__status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.voice-controls__label {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--text-muted);
}

.voice-controls__value {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--text-muted);
}

.voice-controls__value--active {
  color: var(--neon-green);
}

.voice-controls__value--connecting {
  color: var(--neon-orange);
}

.voice-controls__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.voice-controls__value--active .voice-controls__dot {
  box-shadow: 0 0 8px currentColor;
  animation: pulse-dot 2s ease-in-out infinite;
}

.voice-controls__value--connecting .voice-controls__dot {
  animation: blink 1s ease-in-out infinite;
}

.voice-controls__buttons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.voice-controls__btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.875rem 1rem;
  background: var(--void);
  border: 1px solid var(--glass-border);
  border-radius: 10px;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.voice-controls__btn:hover:not(:disabled) {
  border-color: var(--neon-cyan);
  background: rgba(0, 255, 247, 0.05);
}

.voice-controls__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.voice-controls__btn--active {
  border-color: var(--neon-green);
  background: rgba(57, 255, 20, 0.1);
}

.voice-controls__btn--active:hover {
  border-color: var(--neon-pink);
  background: rgba(255, 0, 128, 0.1);
}

.voice-controls__btn--connecting {
  border-color: var(--neon-orange);
  background: rgba(255, 107, 53, 0.1);
}

.voice-controls__btn--mute {
  background: var(--void-lighter);
}

.voice-controls__btn--muted {
  border-color: var(--neon-pink);
  background: rgba(255, 0, 128, 0.15);
  color: var(--neon-pink);
}

.voice-controls__btn-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.voice-controls__btn-icon svg {
  width: 20px;
  height: 20px;
}

.voice-controls__visualizer {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 4px;
  height: 32px;
  margin-top: 1rem;
  padding: 0.5rem;
  background: var(--void);
  border-radius: 8px;
}

.voice-controls__bar {
  width: 4px;
  height: 8px;
  background: var(--neon-green);
  border-radius: 2px;
  animation: equalizer 0.8s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
}

@keyframes equalizer {
  0%,
  100% {
    height: 8px;
  }
  50% {
    height: 24px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .voice-controls {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    border: none;
    border-top: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    padding: 0.75rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom));
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  }

  .voice-controls__header {
    display: none;
  }

  .voice-controls__status {
    display: none;
  }

  .voice-controls__error {
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
  }

  .voice-controls__buttons {
    flex-direction: row;
    gap: 0.75rem;
  }

  .voice-controls__btn {
    flex: 1;
    justify-content: center;
    padding: 1rem 0.75rem;
    border-radius: 12px;
  }

  .voice-controls__btn span {
    font-size: 0.8rem;
  }

  .voice-controls__visualizer {
    display: none;
  }
}
</style>

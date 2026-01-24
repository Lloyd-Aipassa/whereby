import { ref, computed } from 'vue'

export function useVoiceChatJitsi(roomId, userId) {
  const participants = ref({})
  const isMuted = ref(false)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref(null)

  let jitsiApi = null

  // Get connected peers count
  const connectedPeersCount = computed(() => {
    return Object.keys(participants.value).length
  })

  // Start voice chat
  const startVoiceChat = async (otherUsers) => {
    try {
      isConnecting.value = true
      error.value = null

      // Load Jitsi Meet External API script if not already loaded
      if (!window.JitsiMeetExternalAPI) {
        await loadJitsiScript()
      }

      // Create a unique room name based on roomId
      const jitsiRoomName = `whereby-${roomId.replace(/[^a-zA-Z0-9]/g, '')}`

      // Create Jitsi Meet instance (audio only, no UI)
      const domain = '8x8.vc' // Free Jitsi server

      jitsiApi = new window.JitsiMeetExternalAPI(domain, {
        roomName: jitsiRoomName,
        parentNode: createHiddenContainer(),
        userInfo: {
          displayName: userId
        },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: true,
          disableVideo: true,
          prejoinPageEnabled: false,
          enableWelcomePage: false,
          enableClosePage: false,
          disableDeepLinking: true,
          disableInviteFunctions: true,
          hideConferenceSubject: true,
          hideConferenceTimer: true,
          disableProfile: true,
          disableRemoteMute: true,
          remoteVideoMenu: { disabled: true },
          disableTileView: true
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          TOOLBAR_BUTTONS: [],
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          HIDE_INVITE_MORE_HEADER: true,
          MOBILE_APP_PROMO: false,
          SHOW_CHROME_EXTENSION_BANNER: false
        }
      })

      // Event listeners
      jitsiApi.addListener('videoConferenceJoined', (data) => {
        console.log('Joined Jitsi conference:', data)
        isConnected.value = true
        isConnecting.value = false

        // Disable video immediately
        jitsiApi.executeCommand('toggleVideo')
      })

      jitsiApi.addListener('videoConferenceLeft', () => {
        console.log('Left Jitsi conference')
        isConnected.value = false
        participants.value = {}
      })

      jitsiApi.addListener('participantJoined', (data) => {
        console.log('Participant joined:', data)
        participants.value = {
          ...participants.value,
          [data.id]: { id: data.id, displayName: data.displayName }
        }
      })

      jitsiApi.addListener('participantLeft', (data) => {
        console.log('Participant left:', data)
        const newParticipants = { ...participants.value }
        delete newParticipants[data.id]
        participants.value = newParticipants
      })

      jitsiApi.addListener('audioMuteStatusChanged', (data) => {
        isMuted.value = data.muted
      })

      jitsiApi.addListener('errorOccurred', (data) => {
        console.error('Jitsi error:', data)
        error.value = data.error || 'Connection error'
      })

    } catch (err) {
      console.error('Error starting Jitsi voice chat:', err)
      error.value = 'Failed to start voice chat: ' + err.message
      isConnecting.value = false
      throw err
    }
  }

  // Load Jitsi External API script
  const loadJitsiScript = () => {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://8x8.vc/external_api.js'
      script.async = true
      script.onload = resolve
      script.onerror = () => reject(new Error('Failed to load Jitsi script'))
      document.head.appendChild(script)
    })
  }

  // Create hidden container for Jitsi iframe
  const createHiddenContainer = () => {
    // Remove existing container if any
    const existing = document.getElementById('jitsi-container')
    if (existing) existing.remove()

    const container = document.createElement('div')
    container.id = 'jitsi-container'
    container.style.cssText = `
      position: fixed;
      width: 1px;
      height: 1px;
      left: -9999px;
      top: -9999px;
      overflow: hidden;
    `
    document.body.appendChild(container)
    return container
  }

  // Toggle mute
  const toggleMute = () => {
    if (jitsiApi) {
      jitsiApi.executeCommand('toggleAudio')
    }
  }

  // Stop voice chat
  const stopVoiceChat = async () => {
    if (jitsiApi) {
      jitsiApi.dispose()
      jitsiApi = null
    }

    // Remove hidden container
    const container = document.getElementById('jitsi-container')
    if (container) container.remove()

    isConnected.value = false
    isMuted.value = false
    participants.value = {}
  }

  // Handle user joined (for compatibility)
  const handleUserJoined = async (user) => {
    console.log('User joined (handled by Jitsi):', user.username)
  }

  // Handle user left (for compatibility)
  const handleUserLeft = (userId) => {
    console.log('User left (handled by Jitsi):', userId)
  }

  return {
    localStream: ref(null),
    peers: participants,
    isMuted,
    isConnected,
    isConnecting,
    error,
    connectedPeersCount,
    initMicrophone: async () => {},
    toggleMute,
    startVoiceChat,
    stopVoiceChat,
    handleUserJoined,
    handleUserLeft
  }
}

import { ref, computed, onUnmounted } from 'vue'
import Daily from '@daily-co/daily-js'

// Daily.co API key - get yours at https://dashboard.daily.co
const DAILY_API_KEY = import.meta.env.VITE_DAILY_API_KEY || ''

export function useVoiceChatDaily(roomId, userId) {
  const callObject = ref(null)
  const participants = ref({})
  const isMuted = ref(false)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref(null)

  // Get connected peers count (excluding local user)
  const connectedPeersCount = computed(() => {
    return Object.keys(participants.value).filter(id => id !== 'local').length
  })

  // Create or get a Daily.co room
  const getOrCreateRoom = async () => {
    try {
      // Create room via Daily.co REST API
      const response = await fetch('https://api.daily.co/v1/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DAILY_API_KEY}`
        },
        body: JSON.stringify({
          name: `whereby-${roomId}`,
          properties: {
            exp: Math.floor(Date.now() / 1000) + 3600, // Expires in 1 hour
            enable_chat: false,
            enable_screenshare: false,
            start_video_off: true,
            start_audio_off: false
          }
        })
      })

      if (response.status === 400) {
        // Room might already exist, try to get it
        const getResponse = await fetch(`https://api.daily.co/v1/rooms/whereby-${roomId}`, {
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`
          }
        })
        if (getResponse.ok) {
          const room = await getResponse.json()
          return room.url
        }
      }

      if (!response.ok) {
        throw new Error(`Failed to create room: ${response.statusText}`)
      }

      const room = await response.json()
      return room.url
    } catch (err) {
      console.error('Error creating Daily.co room:', err)
      throw err
    }
  }

  // Start voice chat
  const startVoiceChat = async (otherUsers) => {
    try {
      isConnecting.value = true
      error.value = null

      // Get or create the Daily.co room
      const roomUrl = await getOrCreateRoom()

      // Create the call object
      callObject.value = Daily.createCallObject({
        audioSource: true,
        videoSource: false // Audio only
      })

      // Set up event listeners
      callObject.value.on('joined-meeting', (event) => {
        console.log('Joined Daily.co meeting:', event)
        isConnected.value = true
        isConnecting.value = false
      })

      callObject.value.on('left-meeting', () => {
        console.log('Left Daily.co meeting')
        isConnected.value = false
        participants.value = {}
      })

      callObject.value.on('participant-joined', (event) => {
        console.log('Participant joined:', event.participant)
        participants.value = { ...callObject.value.participants() }
      })

      callObject.value.on('participant-left', (event) => {
        console.log('Participant left:', event.participant)
        participants.value = { ...callObject.value.participants() }
      })

      callObject.value.on('participant-updated', (event) => {
        participants.value = { ...callObject.value.participants() }
      })

      callObject.value.on('error', (event) => {
        console.error('Daily.co error:', event)
        error.value = event.errorMsg || 'Connection error'
        isConnecting.value = false
      })

      callObject.value.on('track-started', (event) => {
        // Handle incoming audio tracks
        if (event.track.kind === 'audio' && event.participant && !event.participant.local) {
          console.log('Audio track started from:', event.participant.user_name)
          playAudioTrack(event.track, event.participant.session_id)
        }
      })

      callObject.value.on('track-stopped', (event) => {
        if (event.track.kind === 'audio' && event.participant) {
          console.log('Audio track stopped from:', event.participant.user_name)
          stopAudioTrack(event.participant.session_id)
        }
      })

      // Join the room
      await callObject.value.join({
        url: roomUrl,
        userName: userId
      })

    } catch (err) {
      console.error('Error starting voice chat:', err)
      error.value = 'Failed to start voice chat: ' + err.message
      isConnecting.value = false
      throw err
    }
  }

  // Audio elements for remote participants
  const audioElements = {}

  const playAudioTrack = (track, participantId) => {
    // Remove existing audio element if any
    if (audioElements[participantId]) {
      audioElements[participantId].srcObject = null
      audioElements[participantId].remove()
    }

    const audio = new Audio()
    audio.srcObject = new MediaStream([track])
    audio.autoplay = true
    audio.volume = 1.0
    document.body.appendChild(audio)
    audioElements[participantId] = audio

    audio.play().catch(err => {
      console.error('Error playing audio:', err)
    })
  }

  const stopAudioTrack = (participantId) => {
    if (audioElements[participantId]) {
      audioElements[participantId].srcObject = null
      audioElements[participantId].remove()
      delete audioElements[participantId]
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (callObject.value) {
      const newMuteState = !isMuted.value
      callObject.value.setLocalAudio(!newMuteState)
      isMuted.value = newMuteState
    }
  }

  // Stop voice chat
  const stopVoiceChat = async () => {
    if (callObject.value) {
      await callObject.value.leave()
      callObject.value.destroy()
      callObject.value = null
    }

    // Clean up audio elements
    Object.keys(audioElements).forEach(id => {
      if (audioElements[id]) {
        audioElements[id].srcObject = null
        audioElements[id].remove()
        delete audioElements[id]
      }
    })

    isConnected.value = false
    isMuted.value = false
    participants.value = {}
  }

  // Handle user joined (for compatibility with existing code)
  const handleUserJoined = async (user) => {
    // Daily.co handles this automatically
    console.log('User joined (handled by Daily.co):', user.username)
  }

  // Handle user left (for compatibility with existing code)
  const handleUserLeft = (userId) => {
    // Daily.co handles this automatically
    console.log('User left (handled by Daily.co):', userId)
  }

  return {
    localStream: ref(null), // Not used with Daily.co but kept for compatibility
    peers: participants,
    isMuted,
    isConnected,
    isConnecting,
    error,
    connectedPeersCount,
    initMicrophone: async () => {}, // Not needed with Daily.co
    toggleMute,
    startVoiceChat,
    stopVoiceChat,
    handleUserJoined,
    handleUserLeft
  }
}

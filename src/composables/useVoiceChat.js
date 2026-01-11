import { ref, onUnmounted, computed } from 'vue'
import { db } from '../firebase/config'
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  getDocs
} from 'firebase/firestore'
import SimplePeer from 'simple-peer'

export function useVoiceChat(roomId, userId) {
  const localStream = ref(null)
  const peers = ref({}) // { oderId: { peer, stream, connected } }
  const isMuted = ref(false)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const error = ref(null)
  const audioElements = ref({})

  let signalUnsubscribe = null

  // Get connected peers count
  const connectedPeersCount = computed(() => {
    return Object.values(peers.value).filter(p => p.connected).length
  })

  // Initialize microphone
  const initMicrophone = async () => {
    try {
      isConnecting.value = true
      error.value = null

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      })

      localStream.value = stream
      isConnected.value = true
      isConnecting.value = false

      return stream
    } catch (err) {
      console.error('Error accessing microphone:', err)
      isConnecting.value = false

      if (err.name === 'NotAllowedError') {
        error.value = 'Microphone permission denied. Please allow access to use voice chat.'
      } else if (err.name === 'NotFoundError') {
        error.value = 'No microphone found. Please connect a microphone.'
      } else {
        error.value = 'Failed to access microphone: ' + err.message
      }

      throw err
    }
  }

  // Toggle mute
  const toggleMute = () => {
    if (localStream.value) {
      const audioTrack = localStream.value.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        isMuted.value = !audioTrack.enabled
      }
    }
  }

  // Start voice chat and connect to other users
  const startVoiceChat = async (otherUsers) => {
    try {
      // Init mic if not already
      if (!localStream.value) {
        await initMicrophone()
      }

      // Listen for incoming signals
      listenForSignals()

      // Create peer connections for ALL users who have voice active
      // This ensures full mesh connectivity
      for (const user of otherUsers) {
        if (user.id !== userId && user.isVoiceActive && !peers.value[user.id]) {
          // Initiate connection based on consistent rule (higher ID initiates)
          const shouldInitiate = userId > user.id
          console.log(`Connecting to voice-active user ${user.username} (${user.id}), initiator: ${shouldInitiate}`)
          await createPeerConnection(user.id, shouldInitiate)
        }
      }
    } catch (err) {
      console.error('Error starting voice chat:', err)
      error.value = 'Failed to start voice chat'
    }
  }

  // Create a peer connection
  const createPeerConnection = async (peerId, initiator) => {
    if (!localStream.value) return

    console.log(`Creating peer connection to ${peerId}, initiator: ${initiator}`)

    const peer = new SimplePeer({
      initiator,
      stream: localStream.value,
      trickle: true,
      config: {
        iceServers: [
          // STUN servers
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },

          // Your own TURN server (Primary - fastest and most reliable!)
          {
            urls: 'turn:192.168.2.24:3478',
            username: 'testuser',
            credential: 'testpass123'
          },
          {
            urls: 'turn:192.168.2.24:3478?transport=tcp',
            username: 'testuser',
            credential: 'testpass123'
          },

          // Fallback: Free TURN servers (if your server is unreachable)
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        // More aggressive ICE gathering
        iceCandidatePoolSize: 10
      }
    })

    peers.value[peerId] = {
      peer,
      stream: null,
      connected: false,
      timeout: null
    }

    // Add connection timeout
    peers.value[peerId].timeout = setTimeout(() => {
      if (peers.value[peerId] && !peers.value[peerId].connected) {
        console.error(`Connection to ${peerId} timed out after 30s`)
        removePeer(peerId)
      }
    }, 30000) // 30 second timeout

    // Handle signal (offer/answer/ice candidates)
    peer.on('signal', async (signalData) => {
      try {
        await sendSignal(peerId, signalData)
      } catch (err) {
        console.error('Error sending signal:', err)
      }
    })

    // Handle incoming stream
    peer.on('stream', (stream) => {
      console.log(`Received stream from ${peerId}`)
      peers.value[peerId].stream = stream
      playAudioStream(peerId, stream)
    })

    // Handle connection
    peer.on('connect', () => {
      console.log(`Connected to ${peerId}`)
      if (peers.value[peerId]) {
        peers.value[peerId].connected = true
        // Clear the connection timeout
        if (peers.value[peerId].timeout) {
          clearTimeout(peers.value[peerId].timeout)
          peers.value[peerId].timeout = null
        }
      }
    })

    // Handle errors
    peer.on('error', (err) => {
      console.error(`Peer error with ${peerId}:`, err)
      removePeer(peerId)
    })

    // Handle close
    peer.on('close', () => {
      console.log(`Connection closed with ${peerId}`)
      removePeer(peerId)
    })
  }

  // Send signal through Firebase
  const sendSignal = async (toUserId, signalData) => {
    const signalsRef = collection(db, 'gamerooms', roomId, 'signals')
    await addDoc(signalsRef, {
      from: userId,
      to: toUserId,
      signal: JSON.stringify(signalData),
      createdAt: Date.now()
    })
  }

  // Listen for incoming signals
  const listenForSignals = () => {
    const signalsRef = collection(db, 'gamerooms', roomId, 'signals')
    const q = query(signalsRef, where('to', '==', userId))

    signalUnsubscribe = onSnapshot(q, async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === 'added') {
          const data = change.doc.data()
          const signal = JSON.parse(data.signal)
          const fromUserId = data.from

          console.log(`Received signal from ${fromUserId}, type: ${signal.type}`)

          // Create peer if doesn't exist AND it's an offer
          if (!peers.value[fromUserId]) {
            if (signal.type === 'offer') {
              console.log(`Creating peer connection for incoming offer from ${fromUserId}`)
              await createPeerConnection(fromUserId, false)

              // Wait a bit for peer to initialize
              await new Promise(resolve => setTimeout(resolve, 100))
            } else {
              console.warn(`Received ${signal.type} from ${fromUserId} but no peer exists, ignoring`)
              // Delete the signal and skip
              try {
                await deleteDoc(change.doc.ref)
              } catch (err) {
                console.error('Error deleting signal:', err)
              }
              continue
            }
          }

          // Apply signal
          const peerObj = peers.value[fromUserId]
          if (peerObj && peerObj.peer && !peerObj.peer.destroyed) {
            try {
              peerObj.peer.signal(signal)
            } catch (err) {
              console.error('Error applying signal:', err)
            }
          }

          // Delete processed signal
          try {
            await deleteDoc(change.doc.ref)
          } catch (err) {
            console.error('Error deleting signal:', err)
          }
        }
      }
    })
  }

  // Play audio stream
  const playAudioStream = (peerId, stream) => {
    // Remove existing audio element if any
    if (audioElements.value[peerId]) {
      audioElements.value[peerId].srcObject = null
      audioElements.value[peerId].remove()
    }

    const audio = new Audio()
    audio.srcObject = stream
    audio.autoplay = true
    audio.volume = 1.0

    // Add to DOM (required for some browsers)
    document.body.appendChild(audio)
    audioElements.value[peerId] = audio

    audio.play().catch(err => {
      console.error('Error playing audio:', err)
    })
  }

  // Remove a peer connection
  const removePeer = (peerId) => {
    const peerObj = peers.value[peerId]
    if (peerObj) {
      // Clear timeout if exists
      if (peerObj.timeout) {
        clearTimeout(peerObj.timeout)
      }

      if (peerObj.peer && !peerObj.peer.destroyed) {
        peerObj.peer.destroy()
      }

      // Clean up audio element
      if (audioElements.value[peerId]) {
        audioElements.value[peerId].srcObject = null
        audioElements.value[peerId].remove()
        delete audioElements.value[peerId]
      }

      delete peers.value[peerId]
    }
  }

  // Handle new user joining or existing user activating voice
  const handleUserJoined = async (user) => {
    if (user.id !== userId && user.isVoiceActive && !peers.value[user.id] && localStream.value) {
      // We initiate if our ID is "greater"
      const shouldInitiate = userId > user.id
      console.log(`User ${user.username} activated voice, connecting...`)
      await createPeerConnection(user.id, shouldInitiate)
    }
  }

  // Handle user leaving
  const handleUserLeft = (userId) => {
    removePeer(userId)
  }

  // Stop voice chat
  const stopVoiceChat = async () => {
    // Stop signal listener
    if (signalUnsubscribe) {
      signalUnsubscribe()
      signalUnsubscribe = null
    }

    // Destroy all peer connections
    for (const peerId of Object.keys(peers.value)) {
      removePeer(peerId)
    }

    // Stop local stream
    if (localStream.value) {
      localStream.value.getTracks().forEach(track => track.stop())
      localStream.value = null
    }

    // Clean up signals in Firebase
    try {
      const signalsRef = collection(db, 'gamerooms', roomId, 'signals')

      // Delete signals from this user
      const q1 = query(signalsRef, where('from', '==', userId))
      const snapshot1 = await getDocs(q1)
      for (const doc of snapshot1.docs) {
        await deleteDoc(doc.ref)
      }

      // Delete signals to this user
      const q2 = query(signalsRef, where('to', '==', userId))
      const snapshot2 = await getDocs(q2)
      for (const doc of snapshot2.docs) {
        await deleteDoc(doc.ref)
      }
    } catch (err) {
      console.error('Error cleaning up signals:', err)
    }

    isConnected.value = false
    isMuted.value = false
    peers.value = {}
  }

  // Cleanup on unmount
  onUnmounted(() => {
    stopVoiceChat()
  })

  return {
    localStream,
    peers,
    isMuted,
    isConnected,
    isConnecting,
    error,
    connectedPeersCount,
    initMicrophone,
    toggleMute,
    startVoiceChat,
    stopVoiceChat,
    handleUserJoined,
    handleUserLeft
  }
}

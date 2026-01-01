import { ref, onUnmounted } from 'vue'
import { db } from '../firebase/config'
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDocs,
  where
} from 'firebase/firestore'

export function useGameroom() {
  const rooms = ref([])
  const currentRoom = ref(null)
  const messages = ref([])
  const users = ref([])
  const loading = ref(false)
  const error = ref(null)

  let roomsUnsubscribe = null
  let messagesUnsubscribe = null
  let roomUnsubscribe = null

  // Listen to all available rooms
  const subscribeToRooms = () => {
    const roomsRef = collection(db, 'gamerooms')
    const q = query(roomsRef, orderBy('createdAt', 'desc'))

    roomsUnsubscribe = onSnapshot(q, (snapshot) => {
      rooms.value = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
    }, (err) => {
      console.error('Error fetching rooms:', err)
      error.value = 'Failed to load rooms'
    })
  }

  // Create a new room
  const createRoom = async (roomName, username) => {
    loading.value = true
    error.value = null

    try {
      const userId = generateUserId()
      const roomRef = await addDoc(collection(db, 'gamerooms'), {
        name: roomName,
        users: [{
          id: userId,
          username,
          joinedAt: Date.now()
        }],
        createdAt: serverTimestamp(),
        maxUsers: 4
      })

      return { roomId: roomRef.id, userId }
    } catch (err) {
      console.error('Error creating room:', err)
      error.value = 'Failed to create room'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Join an existing room
  const joinRoom = async (roomId, username, existingUserId = null) => {
    loading.value = true
    error.value = null

    try {
      const roomRef = doc(db, 'gamerooms', roomId)
      const userId = existingUserId || generateUserId()

      // Subscribe to room updates
      roomUnsubscribe = onSnapshot(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          currentRoom.value = { id: snapshot.id, ...snapshot.data() }
          users.value = currentRoom.value.users || []
        } else {
          currentRoom.value = null
          users.value = []
        }
      })

      // Only add user to room if not already added (no existingUserId)
      if (!existingUserId) {
        await updateDoc(roomRef, {
          users: arrayUnion({
            id: userId,
            username,
            joinedAt: Date.now()
          })
        })
      }

      // Subscribe to messages
      const messagesRef = collection(db, 'gamerooms', roomId, 'messages')
      const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'))

      messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        messages.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      })

      return userId
    } catch (err) {
      console.error('Error joining room:', err)
      error.value = 'Failed to join room'
      throw err
    } finally {
      loading.value = false
    }
  }

  // Leave the current room
  const leaveRoom = async (roomId, userId, username) => {
    try {
      const roomRef = doc(db, 'gamerooms', roomId)

      // Find user object to remove
      const userToRemove = users.value.find(u => u.id === userId)
      if (userToRemove) {
        await updateDoc(roomRef, {
          users: arrayRemove(userToRemove)
        })
      }

      // Clean up signals
      await cleanupSignals(roomId, userId)

      // Check if room is empty and delete
      const updatedRoom = currentRoom.value
      if (updatedRoom && updatedRoom.users && updatedRoom.users.length <= 1) {
        await deleteRoom(roomId)
      }

      // Cleanup subscriptions
      if (messagesUnsubscribe) messagesUnsubscribe()
      if (roomUnsubscribe) roomUnsubscribe()

      currentRoom.value = null
      messages.value = []
      users.value = []
    } catch (err) {
      console.error('Error leaving room:', err)
      error.value = 'Failed to leave room'
    }
  }

  // Send a chat message
  const sendMessage = async (roomId, userId, username, text) => {
    if (!text.trim()) return

    try {
      const messagesRef = collection(db, 'gamerooms', roomId, 'messages')
      await addDoc(messagesRef, {
        userId,
        username,
        text: text.trim(),
        createdAt: serverTimestamp()
      })
    } catch (err) {
      console.error('Error sending message:', err)
      error.value = 'Failed to send message'
    }
  }

  // Delete a room
  const deleteRoom = async (roomId) => {
    try {
      // Delete all messages
      const messagesRef = collection(db, 'gamerooms', roomId, 'messages')
      const messagesSnapshot = await getDocs(messagesRef)
      for (const msgDoc of messagesSnapshot.docs) {
        await deleteDoc(msgDoc.ref)
      }

      // Delete all signals
      const signalsRef = collection(db, 'gamerooms', roomId, 'signals')
      const signalsSnapshot = await getDocs(signalsRef)
      for (const sigDoc of signalsSnapshot.docs) {
        await deleteDoc(sigDoc.ref)
      }

      // Delete room
      await deleteDoc(doc(db, 'gamerooms', roomId))
    } catch (err) {
      console.error('Error deleting room:', err)
    }
  }

  // Cleanup signals for a user
  const cleanupSignals = async (roomId, userId) => {
    try {
      const signalsRef = collection(db, 'gamerooms', roomId, 'signals')
      const q = query(signalsRef, where('from', '==', userId))
      const snapshot = await getDocs(q)

      for (const sigDoc of snapshot.docs) {
        await deleteDoc(sigDoc.ref)
      }

      // Also delete signals sent to this user
      const q2 = query(signalsRef, where('to', '==', userId))
      const snapshot2 = await getDocs(q2)

      for (const sigDoc of snapshot2.docs) {
        await deleteDoc(sigDoc.ref)
      }
    } catch (err) {
      console.error('Error cleaning up signals:', err)
    }
  }

  // Generate a unique user ID
  const generateUserId = () => {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
  }

  // Check if room is full
  const isRoomFull = (room) => {
    return room.users && room.users.length >= (room.maxUsers || 4)
  }

  // Cleanup on unmount
  onUnmounted(() => {
    if (roomsUnsubscribe) roomsUnsubscribe()
    if (messagesUnsubscribe) messagesUnsubscribe()
    if (roomUnsubscribe) roomUnsubscribe()
  })

  return {
    rooms,
    currentRoom,
    messages,
    users,
    loading,
    error,
    subscribeToRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    sendMessage,
    deleteRoom,
    isRoomFull,
    generateUserId
  }
}

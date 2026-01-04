import { ref, computed } from 'vue'

// Admin credentials - multiple admins with same password
const ADMIN_ACCOUNTS = [
  { email: 'lloyd.aipassa@gmail.com', password: 'Aipassa321!', name: 'Lloyd' },
  { email: 'ioaioassa@gmail.com', password: 'Aipassa321!', name: 'Manoe' },
  { email: 'mickeyaipassa@hotmail.com', password: 'Aipassa321!', name: 'Mickey' }
]

const ADMIN_SESSION_KEY = 'whereby_admin_session'

// Check for existing admin session in localStorage
const getStoredAdminEmail = () => {
  try {
    return localStorage.getItem(ADMIN_SESSION_KEY)
  } catch (error) {
    console.error('Failed to get admin session:', error)
    return null
  }
}

// Global admin state (shared across components)
const isAdmin = ref(false)
const adminEmail = ref(null)

// Initialize admin state from localStorage
const storedEmail = getStoredAdminEmail()
if (storedEmail) {
  // Verify that the stored email is still a valid admin
  const validAdmin = ADMIN_ACCOUNTS.find(admin => admin.email === storedEmail)
  if (validAdmin) {
    isAdmin.value = true
    adminEmail.value = storedEmail
  } else {
    // Invalid admin email in storage, clear it
    localStorage.removeItem(ADMIN_SESSION_KEY)
  }
}

export function useAdmin() {
  const loginError = ref(null)

  // Get the logged-in admin's name
  const adminName = computed(() => {
    if (!adminEmail.value) return null
    const admin = ADMIN_ACCOUNTS.find(a => a.email === adminEmail.value)
    return admin ? admin.name : null
  })

  const login = (email, password) => {
    loginError.value = null

    // Check if credentials match any admin account
    const validAdmin = ADMIN_ACCOUNTS.find(
      admin => admin.email === email && admin.password === password
    )

    if (validAdmin) {
      isAdmin.value = true
      adminEmail.value = email

      // Save admin session to localStorage
      try {
        localStorage.setItem(ADMIN_SESSION_KEY, email)
      } catch (error) {
        console.error('Failed to save admin session:', error)
      }

      return true
    } else {
      loginError.value = 'Invalid email or password'
      return false
    }
  }

  const logout = () => {
    isAdmin.value = false
    adminEmail.value = null

    // Clear admin session from localStorage
    try {
      localStorage.removeItem(ADMIN_SESSION_KEY)
    } catch (error) {
      console.error('Failed to clear admin session:', error)
    }
  }

  return {
    isAdmin,
    adminEmail,
    adminName,
    loginError,
    login,
    logout
  }
}

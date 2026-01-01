import { ref, computed } from 'vue'

// Admin credentials - multiple admins with same password
const ADMIN_ACCOUNTS = [
  { email: 'lloyd.aipassa@gmail.com', password: 'Aipassa321!', name: 'Lloyd' },
  { email: 'ioaioassa@gmail.com', password: 'Aipassa321!', name: 'Manoe' },
  { email: 'mickeyaipassa@hotmail.com', password: 'Aipassa321!', name: 'Mickey' }
]

// Global admin state (shared across components)
const isAdmin = ref(false)
const adminEmail = ref(null)

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
      return true
    } else {
      loginError.value = 'Invalid email or password'
      return false
    }
  }

  const logout = () => {
    isAdmin.value = false
    adminEmail.value = null
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

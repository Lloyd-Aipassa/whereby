import { ref } from 'vue'

// Admin credentials - multiple admins with same password
const ADMIN_ACCOUNTS = [
  { email: 'lloyd.aipassa@gmail.com', password: 'Aipassa321!' },
  { email: 'ioaioassa@gmail.com', password: 'Aipassa321!' },
  { email: 'mickeyaipassa@hotmail.com', password: 'Aipassa321!' }
]

// Global admin state (shared across components)
const isAdmin = ref(false)
const adminEmail = ref(null)

export function useAdmin() {
  const loginError = ref(null)

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
    loginError,
    login,
    logout
  }
}

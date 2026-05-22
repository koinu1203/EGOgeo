import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const AUTH_TOKEN_KEY = 'auth_token'
const AUTH_USER_EMAIL_KEY = 'auth_user_email'

export const useAuthStore = defineStore('auth', () => {
  const token = ref('')
  const userEmail = ref('')

  const isAuthenticated = computed(() => token.value.length > 0)

  const setSession = (nextToken: string, nextUserEmail = '') => {
    token.value = nextToken
    userEmail.value = nextUserEmail

    localStorage.setItem(AUTH_TOKEN_KEY, nextToken)
    localStorage.setItem(AUTH_USER_EMAIL_KEY, nextUserEmail)
  }

  const clearSession = () => {
    token.value = ''
    userEmail.value = ''

    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_EMAIL_KEY)
  }

  const initializeSession = () => {
    token.value = localStorage.getItem(AUTH_TOKEN_KEY) ?? ''
    userEmail.value = localStorage.getItem(AUTH_USER_EMAIL_KEY) ?? ''
  }

  return {
    token,
    userEmail,
    isAuthenticated,
    setSession,
    clearSession,
    initializeSession,
  }
})

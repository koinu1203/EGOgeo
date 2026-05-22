<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'

import AuthModal from '../components/modals/AuthModal.vue'
import { logoutUser } from '../services/auth.service'
import { useAuthStore } from '../stores/auth.store'

type AuthMode = 'login' | 'register'

const authStore = useAuthStore()
const { isAuthenticated, token, userEmail } = storeToRefs(authStore)

const isAuthModalVisible = ref(false)
const authMode = ref<AuthMode>('login')

const openAuthModal = (mode: AuthMode) => {
  authMode.value = mode
  isAuthModalVisible.value = true
}

const onAuthenticated = (payload: { token: string; correo: string }) => {
  authStore.setSession(payload.token, payload.correo)
}

const logout = async () => {
  try {
    if (token.value) {
      await logoutUser(token.value)
    }
  } finally {
    authStore.clearSession()
  }
}

</script>

<template>
  <div class="mx-auto overflow-hidden border border-[var(--app-border)] bg-[var(--app-shell-bg)] shadow-[0_20px_45px_rgba(15,30,70,0.22)]">
    <header
      class="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--app-border)] bg-gradient-to-r from-[var(--app-shell-bg-soft)] to-[var(--app-shell-bg-soft-2)] px-5 py-4"
    >
      <div class="flex items-center gap-3">
        <img
          src="/logo.svg"
          alt="Proyecto Coordenadas logo"
          class="h-10 w-10 shrink-0"
        />
        <div>
          <p class="m-0 text-sm font-bold text-[var(--app-title)] sm:text-base">EGOGeo</p>
        </div>
      </div>

      <nav
        class="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto"
        aria-label="Quick actions"
      >
        <template v-if="!isAuthenticated">
          <Button label="Login" outlined @click="openAuthModal('login')" />
          <Button label="Register" @click="openAuthModal('register')" />
        </template>
        <template v-else>
          <span
            class="inline-flex h-9 max-w-[220px] items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-semibold text-[var(--app-muted)]"
          >
            {{ userEmail || 'Authenticated user' }}
          </span>
          <Button label="Logout" outlined severity="secondary" @click="logout" />
        </template>
      </nav>
    </header>

    <div class="min-h-[68vh]">
      <main class="pb-0" aria-label="Main content">
        <div>
          <RouterView />
        </div>
      </main>
    </div>

    <footer class="border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] px-5 py-3 text-[var(--app-muted)]">
      <small>Proyecto Coordenadas · Frontend base</small>
    </footer>

    <AuthModal
      v-model:visible="isAuthModalVisible"
      :initial-mode="authMode"
      @authenticated="onAuthenticated"
    />
  </div>
</template>

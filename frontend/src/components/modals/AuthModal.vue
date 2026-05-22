<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { isAxiosError } from 'axios'

import { loginUser, registerUser, type AuthPayload } from '../../services/auth.service'

type AuthMode = 'login' | 'register'

const props = withDefaults(
  defineProps<{
    visible: boolean
    initialMode?: AuthMode
  }>(),
  {
    initialMode: 'login',
  },
)

const emit = defineEmits<{
  (event: 'update:visible', value: boolean): void
  (event: 'authenticated', payload: { token: string; correo: string }): void
}>()

const mode = ref<AuthMode>(props.initialMode)
const loading = ref(false)
const errorMessage = ref('')

const form = reactive<AuthPayload>({
  correo: '',
  password: '',
})

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const title = computed(() => (mode.value === 'login' ? 'Login' : 'Register'))
const submitLabel = computed(() => (mode.value === 'login' ? 'Sign in' : 'Create account'))
const switchLabel = computed(() =>
  mode.value === 'login' ? 'Need an account? Register' : 'Already have an account? Login',
)

watch(
  () => props.initialMode,
  (value) => {
    mode.value = value
  },
)

watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      errorMessage.value = ''
    }
  },
)

const close = () => {
  dialogVisible.value = false
}

const toggleMode = () => {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  errorMessage.value = ''
}

const onSubmit = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const payload = {
      correo: form.correo.trim(),
      password: form.password,
    }

    const response = mode.value === 'login' ? await loginUser(payload) : await registerUser(payload)
    const token = response.token ?? response.accessToken

    if (token) {
      emit('authenticated', { token, correo: payload.correo })
    }

    close()
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      const apiMessage = (error.response?.data as { message?: string } | undefined)?.message
      errorMessage.value = apiMessage ?? 'Authentication request failed.'
    } else {
      errorMessage.value = 'Unexpected error while processing authentication.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog
    v-model:visible="dialogVisible"
    :header="title"
    modal
    :draggable="false"
    :closable="!loading"
    class="auth-modal"
  >
    <form class="auth-form" @submit.prevent="onSubmit">
      <label class="auth-label" for="auth-email">Email</label>
      <InputText
        id="auth-email"
        v-model="form.correo"
        type="email"
        autocomplete="email"
        placeholder="name@example.com"
        :disabled="loading"
        required
      />

      <label class="auth-label" for="auth-password">Password</label>
      <Password
        id="auth-password"
        v-model="form.password"
        :feedback="mode === 'register'"
        toggle-mask
        fluid
        :disabled="loading"
        autocomplete="current-password"
        required
      />

      <small v-if="errorMessage" class="auth-error">{{ errorMessage }}</small>

      <div class="auth-actions">
        <Button
          type="button"
          label="Cancel"
          text
          :disabled="loading"
          @click="close"
        />
        <Button type="submit" :label="submitLabel" :loading="loading" />
      </div>

      <Button
        type="button"
        link
        :label="switchLabel"
        class="auth-switch"
        :disabled="loading"
        @click="toggleMode"
      />
    </form>
  </Dialog>
</template>

<style scoped lang="scss">
.auth-modal {
  width: min(92vw, 28rem);
}

.auth-form {
  display: grid;
  gap: 0.75rem;
}

.auth-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
}

.auth-actions {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.auth-error {
  color: #b42318;
  font-weight: 500;
}

.auth-switch {
  justify-self: flex-start;
  padding-left: 0;
}
</style>

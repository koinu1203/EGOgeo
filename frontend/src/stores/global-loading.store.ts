import { ref } from 'vue'
import { defineStore } from 'pinia'

type BeginLoadingInput = {
  title?: string
  message?: string
  progress?: number
}

export const useGlobalLoadingStore = defineStore('global-loading', () => {
  const isActive = ref(false)
  const title = ref('Loading')
  const message = ref('Please wait...')
  const progress = ref(0)

  const begin = (input: BeginLoadingInput = {}) => {
    isActive.value = true
    title.value = input.title ?? 'Loading'
    message.value = input.message ?? 'Please wait...'
    progress.value = Math.max(0, Math.min(100, Number(input.progress ?? 0)))
  }

  const setProgress = (value: number) => {
    progress.value = Math.max(0, Math.min(100, Number(value)))
  }

  const setMessage = (value: string) => {
    message.value = value || 'Please wait...'
  }

  const finish = () => {
    progress.value = 100
    window.setTimeout(() => {
      isActive.value = false
    }, 220)
  }

  return {
    isActive,
    title,
    message,
    progress,
    begin,
    setProgress,
    setMessage,
    finish,
  }
})

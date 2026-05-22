import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

const TEMPLATE_LAYOUT_KEY = 'template_layout_is_docked'

export const useTemplateStore = defineStore('template', () => {
  const isDocked = ref(true)

  const isUndocked = computed(() => !isDocked.value)

  const setDocked = (nextValue: boolean) => {
    isDocked.value = nextValue
    localStorage.setItem(TEMPLATE_LAYOUT_KEY, String(nextValue))
  }

  const toggleDocked = () => {
    setDocked(!isDocked.value)
  }

  const initializeTemplateState = () => {
    const storedValue = localStorage.getItem(TEMPLATE_LAYOUT_KEY)

    if (storedValue === null) {
      return
    }

    isDocked.value = storedValue === 'true'
  }

  return {
    isDocked,
    isUndocked,
    setDocked,
    toggleDocked,
    initializeTemplateState,
  }
})
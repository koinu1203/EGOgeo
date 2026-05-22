<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { GoogleMapsMapInstance } from '../../views/dashboard/map.types'

type PlaceSelectedPayload = {
  lat: number
  lng: number
  address: string
}

const props = defineProps<{
  map: GoogleMapsMapInstance | null
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'selected', value: PlaceSelectedPayload): void
}>()

type AutocompleteLike = {
  addListener: (eventName: string, handler: () => void) => { remove?: () => void }
  getPlace: () => {
    name?: string
    formatted_address?: string
    geometry?: {
      location?: {
        lat: () => number
        lng: () => number
      }
    }
  }
}

const inputRef = ref<HTMLInputElement | null>(null)
const isReady = ref(false)
const initError = ref('')

let autocompleteInstance: AutocompleteLike | null = null
let placeChangedListener: { remove?: () => void } | null = null

const initAutocomplete = () => {
  if (autocompleteInstance || !inputRef.value) {
    return
  }

  const googleMaps = (window as Window & {
    google?: {
      maps?: {
        places?: {
          Autocomplete: new (
            input: HTMLInputElement,
            options?: Record<string, unknown>,
          ) => AutocompleteLike
        }
      }
    }
  }).google?.maps

  if (!googleMaps?.places?.Autocomplete) {
    initError.value = 'Places autocomplete is not available yet.'
    return
  }

  autocompleteInstance = new googleMaps.places.Autocomplete(inputRef.value, {
    fields: ['formatted_address', 'geometry', 'name'],
    types: ['geocode'],
  })

  placeChangedListener = autocompleteInstance.addListener('place_changed', () => {
    if (!autocompleteInstance) {
      return
    }

    const place = autocompleteInstance.getPlace()
    const location = place.geometry?.location

    if (!location) {
      return
    }

    const lat = location.lat()
    const lng = location.lng()
    const address = place.formatted_address || place.name || 'Selected location'

    emit('selected', { lat, lng, address })
  })

  initError.value = ''
  isReady.value = true
}

onMounted(() => {
  initAutocomplete()
})

watch(
  () => props.map,
  () => {
    initAutocomplete()
  },
)

onBeforeUnmount(() => {
  if (placeChangedListener?.remove) {
    placeChangedListener.remove()
  }

  placeChangedListener = null
  autocompleteInstance = null
})
</script>

<template>
  <div class="pointer-events-auto absolute left-1/2 top-3 z-20 w-[min(560px,calc(100%-1.5rem))] -translate-x-1/2 p-3 bg-[var(--app-surface-soft)] rounded-lg">
    <div class="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.18)]">
      <input
        ref="inputRef"
        type="text"
        class="w-full border-none bg-transparent text-sm text-[var(--app-text)] outline-none placeholder:text-[var(--app-muted)]"
        placeholder="Search address or place..."
        :disabled="disabled"
      />
      <p v-if="!isReady || initError" class="m-0 mt-1 text-[11px] text-[var(--app-muted)]">
        {{ initError || 'Loading places autocomplete...' }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import {
  getPoligonoDetalle,
  updatePoligono,
  type PoligonoItem,
  type PuntoDentroPoligonoItem,
} from '../../services/poligonos.service'

const props = defineProps<{
  poligono: PoligonoItem | null
}>()

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'updated', value: PoligonoItem): void
}>()

const isLoadingPoints = ref(false)
const isSaving = ref(false)
const pointsError = ref('')
const saveStatus = ref('')
const points = ref<PuntoDentroPoligonoItem[]>([])
const totalMontoAnual = ref(0)

const nombre = ref('')
const colorHex = ref('#3388ff')

const colorPickerValue = computed({
  get: () => colorHex.value.replace('#', ''),
  set: (value: string) => {
    const sanitized = String(value ?? '').replace('#', '').slice(0, 6)

    if (sanitized.length === 6) {
      colorHex.value = `#${sanitized}`
    }
  },
})

const resetEditor = (poligono: PoligonoItem | null) => {
  if (!poligono) {
    nombre.value = ''
    colorHex.value = '#3388ff'
    points.value = []
    pointsError.value = ''
    saveStatus.value = ''
    return
  }

  nombre.value = poligono.nombre || ''
  colorHex.value = poligono.color_hex || '#3388ff'
  saveStatus.value = ''
}

const loadPoints = async (poligonoId: number) => {
  isLoadingPoints.value = true
  pointsError.value = ''

  try {
    const response = await getPoligonoDetalle(poligonoId)
    points.value = response.points
    totalMontoAnual.value = Number(response.totalMontoAnual || 0)
    nombre.value = response.poligono.nombre || nombre.value
    colorHex.value = response.poligono.color_hex || colorHex.value
  } catch {
    points.value = []
    totalMontoAnual.value = 0
    pointsError.value = 'Could not load points inside this polygon.'
  } finally {
    isLoadingPoints.value = false
  }
}

watch(
  () => props.poligono,
  (nextPoligono) => {
    resetEditor(nextPoligono)

    if (!nextPoligono) {
      return
    }

    loadPoints(nextPoligono.id)
  },
  { immediate: true },
)

const saveChanges = async () => {
  if (!props.poligono || isSaving.value) {
    return
  }

  isSaving.value = true
  saveStatus.value = ''

  try {
    const updated = await updatePoligono(props.poligono.id, {
      nombre: nombre.value.trim() || props.poligono.nombre,
      colorHex: colorHex.value,
      estiloPunto: props.poligono.estilo_punto,
      areaCoordinates: props.poligono.area.coordinates,
    })

    emit('updated', updated)
    saveStatus.value = 'Polygon updated successfully.'
  } catch {
    saveStatus.value = 'Could not save polygon changes.'
  } finally {
    isSaving.value = false
  }
}

const formatPoint = (value: number) => value.toFixed(6)

const formatAmount = (value: number, currencyCode = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode || 'USD',
      maximumFractionDigits: 2,
    }).format(Number(value || 0))
  } catch {
    return Number(value || 0).toFixed(2)
  }
}
</script>

<template>
  <aside
    class="absolute right-3 top-14 bottom-3 z-20 flex w-[min(420px,calc(100%-1.5rem))] flex-col rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.22)]"
  >
    <div class="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-3">
      <div>
        <p class="m-0 text-xs uppercase tracking-[0.08em] text-[var(--app-muted)]">Polygon details</p>
        <p class="m-0 mt-1 text-sm font-semibold text-[var(--app-text)]">
          {{ poligono?.nombre || `Polygon #${poligono?.id ?? ''}` }}
        </p>
      </div>

      <Button
        icon="pi pi-times"
        text
        rounded
        aria-label="Close polygon details"
        @click="emit('close')"
      />
    </div>

    <div v-if="!poligono" class="rounded-lg border border-dashed border-[var(--app-border)] p-3 text-sm text-[var(--app-muted)]">
      Select a polygon from the left panel.
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3">
        <label class="text-xs uppercase tracking-[0.08em] text-[var(--app-muted)]">
          Name
          <InputText
            v-model="nombre"
            class="mt-2 w-full"
            placeholder="Polygon name"
          />
        </label>

        <label class="text-xs uppercase tracking-[0.08em] text-[var(--app-muted)]">
          Color
          <div class="mt-2 flex items-center gap-2">
            <ColorPicker v-model="colorPickerValue" format="hex" />
            <span class="rounded border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-xs text-[var(--app-text)]">
              {{ colorHex }}
            </span>
          </div>
        </label>

        <Button
          label="Save changes"
          icon="pi pi-save"
          size="small"
          :loading="isSaving"
          @click="saveChanges"
        />

        <p v-if="saveStatus" class="m-0 text-xs text-[var(--app-muted)]">
          {{ saveStatus }}
        </p>
      </div>

      <div class="mt-4 min-h-0 flex flex-1 flex-col overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5">
        <div class="mb-2 flex items-center justify-between">
          <p class="m-0 text-xs uppercase tracking-[0.08em] text-[var(--app-muted)]">
            Points inside polygon ({{ points.length }})
          </p>
          <Button
            icon="pi pi-refresh"
            text
            rounded
            size="small"
            :loading="isLoadingPoints"
            aria-label="Refresh points"
            @click="loadPoints(poligono.id)"
          />
        </div>

        <div class="mb-2 rounded border border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2 py-1.5">
          <p class="m-0 text-[11px] uppercase tracking-[0.08em] text-[var(--app-muted)]">Total annual amount</p>
          <p class="m-0 mt-1 text-sm font-semibold text-[var(--app-text)]">
            s/.  {{ formatAmount(totalMontoAnual, points[0]?.moneda || 'USD') }}
          </p>
        </div>

        <div v-if="isLoadingPoints" class="py-2 text-sm text-[var(--app-muted)]">
          Loading points...
        </div>

        <div v-else-if="pointsError" class="rounded border border-dashed border-[var(--app-border)] p-2 text-xs text-[var(--app-muted)]">
          {{ pointsError }}
        </div>

        <div v-else-if="points.length === 0" class="rounded border border-dashed border-[var(--app-border)] p-2 text-xs text-[var(--app-muted)]">
          No points inside this polygon.
        </div>

        <ul v-else class="m-0 min-h-0 flex-1 list-none space-y-2 overflow-auto p-0 pr-1 pb-2">
          <li
            v-for="item in points"
            :key="item.cliente_id"
            class="rounded border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-2"
          >
            <p class="m-0 truncate text-xs font-semibold text-[var(--app-title)]">
              {{ item.nombre }}
            </p>
            <p class="m-0 mt-1 text-[11px] text-[var(--app-muted)]">
              IDs: {{ item.id }} / {{ item.cliente_id }}
            </p>
            <p class="m-0 mt-1 text-[11px] text-[var(--app-muted)]">
              Currency: {{ item.moneda }} | Purchase amount: {{ formatAmount(item.importe_compras, item.moneda) }}
            </p>
            <!-- <p class="m-0 mt-1 text-[11px] text-[var(--app-muted)]">
              {{ formatPoint(item.latitud) }}, {{ formatPoint(item.longitud) }}
            </p> -->
          </li>
        </ul>
      </div>
    </template>
  </aside>
</template>

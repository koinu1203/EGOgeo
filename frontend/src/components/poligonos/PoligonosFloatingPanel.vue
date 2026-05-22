<script setup lang="ts">
import type { PoligonoItem } from '../../services/poligonos.service'

defineProps<{
  loading: boolean
  deletingId: number | null
  selectedId: number | null
  poligonos: PoligonoItem[]
}>()

const emit = defineEmits<{
  (event: 'delete', id: number): void
  (event: 'select', id: number): void
}>()

const formatDate = (value: string) => {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(parsed)
}
</script>

<template>
  <section aria-label="Polygons panel" class="flex min-h-0 min-w-0 w-full max-w-full flex-1 flex-col overflow-hidden">
    <div v-if="loading" class="py-3 text-sm text-[var(--app-muted)]">
      Loading polygons...
    </div>

    <div v-else-if="poligonos.length === 0" class="rounded-lg border border-dashed border-[var(--app-border)] p-3 text-sm text-[var(--app-muted)]">
      No polygons yet.
    </div>

    <ul v-else class="m-0 min-h-0 min-w-0 w-full max-w-full flex-1 list-none space-y-2 overflow-auto p-0">
      <li
        v-for="poligono in poligonos"
        :key="poligono.id"
        class="w-full max-w-full min-w-0 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-soft)]/80 cursor-pointer  p-2.5 "
        :class="{
          '!border-white bg-[var(--app-surface-soft)]': selectedId === poligono.id,
        }"
        role="button"
        tabindex="0"
        @click="emit('select', poligono.id)"
        @keydown.enter.prevent="emit('select', poligono.id)"
        @keydown.space.prevent="emit('select', poligono.id)"
      >
        <div class="flex w-full min-w-0 max-w-full items-start justify-between gap-2 overflow-hidden">
          <div class="min-w-0 flex-1">
            <p class="m-0 truncate text-sm font-semibold text-[var(--app-title)]">
              {{ poligono.nombre || `Polygon #${poligono.id}` }}
            </p>
            <p class="mt-1 text-xs text-[var(--app-muted)]">
              {{ formatDate(poligono.fecha_creacion) }}
            </p>
          </div>

          <div class="flex shrink-0 items-center gap-1">
            <span
              class="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-white/80 shadow"
              :style="{ backgroundColor: poligono.color_hex }"
              :title="`Color: ${poligono.color_hex}`"
            ></span>
            <Button
              label="Delete"
              icon="pi pi-trash"
              text
              severity="danger"
              size="small"
              :loading="deletingId === poligono.id"
              :disabled="deletingId === poligono.id"
              :aria-label="`Delete ${poligono.nombre || `polygon ${poligono.id}`}`"
              @click.stop="emit('delete', poligono.id)"
            />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

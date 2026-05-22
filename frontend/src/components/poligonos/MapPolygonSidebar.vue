<script setup lang="ts">
import { computed } from 'vue'

import type { PoligonoItem } from '../../services/poligonos.service'
import type { VendedorItem } from '../../services/vendedores.service'
import PoligonosFloatingPanel from './PoligonosFloatingPanel.vue'
import VendedoresFloatingPanel from '../vendedores/VendedoresFloatingPanel.vue'

const props = defineProps<{
  isDrawingPolygon: boolean
  canSavePolygon: boolean
  isSavingPolygon: boolean
  showPoligonosPanel: boolean
  showVendedoresPanel: boolean
  isLoadingPolygons: boolean
  isLoadingVendedores: boolean
  deletingPoligonoId: number | null
  polygonDraftPointsCount: number
  savedPoligonos: PoligonoItem[]
  savedVendedores: VendedorItem[]
  selectedVendedores: VendedorItem[]
  pointsPerVendor: number
  canGeneratePolygons: boolean
  isGeneratingPolygons: boolean
  selectedColor: string
}>()

const emit = defineEmits<{
  (event: 'toggle-drawing'): void
  (event: 'save'): void
  (event: 'toggle-list'): void
  (event: 'toggle-vendors-list'): void
  (event: 'refresh-list'): void
  (event: 'refresh-vendors-list'): void
  (event: 'delete', id: number): void
  (event: 'color-change', color: string): void
  (event: 'update:selected-vendedores', value: VendedorItem[]): void
  (event: 'update:points-per-vendor', value: number): void
  (event: 'generate-polygons'): void
}>()

const pointsPerVendorProxy = computed({
  get: () => props.pointsPerVendor,
  set: (value: number | null | undefined) => emit('update:points-per-vendor', Number(value ?? 0)),
})

const activeAccordionPanels = computed(() => {
  const panels: string[] = []

  if (props.showVendedoresPanel) {
    panels.push('vendors')
  }

  if (props.showPoligonosPanel) {
    panels.push('polygons')
  }

  return panels
})

const updateAccordionPanels = (value: string | string[] | null | undefined) => {
  const panels = Array.isArray(value) ? value : value ? [value] : []
  const showVendors = panels.includes('vendors')
  const showPolygons = panels.includes('polygons')

  if (showVendors !== props.showVendedoresPanel) {
    emit('toggle-vendors-list')
  }

  if (showPolygons !== props.showPoligonosPanel) {
    emit('toggle-list')
  }
}

const selectAllVendedores = () => {
  emit('update:selected-vendedores', [...props.savedVendedores])
}

const handleGeneratePolygons = () => {
  emit('generate-polygons')
}
</script>

<template>
  <aside class="absolute left-3 top-14 bottom-3 z-20 flex w-[min(420px,calc(100%-1.5rem))] flex-col rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 shadow-[0_12px_28px_rgba(15,23,42,0.22)]">
    <div class="mb-3 border-b border-[var(--app-border)] pb-3">
      <p class="m-0 text-xs uppercase tracking-[0.08em] text-[var(--app-muted)]">Generation tools</p>
    </div>

    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <label class="block text-xs uppercase tracking-[0.08em] text-[var(--app-muted)]" for="points-per-vendor">
        Points per vendor
        <InputNumber
          input-id="points-per-vendor"
          v-model="pointsPerVendorProxy"
          :min="1"
          :use-grouping="false"
          show-buttons
          button-layout="horizontal"
          class="w-full mt-2"
          fluid
        />
      </label>

      <p class="text-xs text-[var(--app-muted)]">
        Selected vendors: {{ selectedVendedores.length }}
      </p>

      <Accordion
        :value="activeAccordionPanels"
        multiple
        class="map-sidebar-accordion"
        @update:value="updateAccordionPanels"
      >
        <AccordionPanel value="vendors">
          <AccordionHeader>
            <div class="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
              <div class="min-w-0">
                <p class="m-0 text-sm font-semibold text-[var(--app-text)]">Show vendors</p>
                <p class="m-0 text-xs text-[var(--app-muted)]">{{ selectedVendedores.length }} selected</p>
              </div>
              <Button
                label="Select"
                size="small"
                text
                :disabled="savedVendedores.length === 0 || selectedVendedores.length === 0 || selectedVendedores.length === savedVendedores.length"
                @click.stop="selectAllVendedores"
              />
            </div>
          </AccordionHeader>
          <AccordionContent>
            <div class="min-h-0 min-w-0 overflow-hidden rounded-lg border border-[var(--app-border)] bg-[transparent] p-2.5">
              <div class="mb-2 flex items-center justify-between gap-2">
                <p class="m-0 text-xs uppercase tracking-[0.08em] text-[var(--app-muted)]">Vendedores</p>
                <Button
                  icon="pi pi-refresh"
                  text
                  rounded
                  size="small"
                  :loading="isLoadingVendedores"
                  aria-label="Refresh vendors"
                  @click="emit('refresh-vendors-list')"
                />
              </div>

              <VendedoresFloatingPanel
                :loading="isLoadingVendedores"
                :vendedores="savedVendedores"
                :selection="selectedVendedores"
                class="min-w-0"
                @update:selection="(value) => emit('update:selected-vendedores', value)"
                @refresh="emit('refresh-vendors-list')"
              />
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>

      <div class="flex flex-col gap-2">
        <Button
          label="Generate polygons"
          icon="pi pi-sparkles"
          size="small"
          :loading="isGeneratingPolygons"
          :disabled="!canGeneratePolygons || isGeneratingPolygons"
          class="generate-polygons-button"
          @click="handleGeneratePolygons"
        />
      </div>

      <Accordion
        :value="activeAccordionPanels"
        multiple
        class="map-sidebar-accordion flex min-h-0 flex-1 flex-col overflow-hidden"
        @update:value="updateAccordionPanels"
      >
        <AccordionPanel value="polygons">
          <AccordionHeader>
            <div class="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2">
              <div class="min-w-0">
                <p class="m-0 text-sm font-semibold text-[var(--app-text)]">Show polygons</p>
                <p class="m-0 text-xs text-[var(--app-muted)]">{{ savedPoligonos.length }} available</p>
              </div>
            </div>
          </AccordionHeader>
          <AccordionContent>
            <div class="flex min-h-0 h-full min-w-0 w-full max-w-full flex-col overflow-hidden rounded-lg border border-[var(--app-border)] bg-[transparent] p-2.5">
              <div class="mb-2 flex items-center justify-between gap-2">
                <p class="m-0 text-xs uppercase tracking-[0.08em] text-[var(--app-muted)]">Polygons</p>
                <Button
                  icon="pi pi-refresh"
                  text
                  rounded
                  size="small"
                  :loading="isLoadingPolygons"
                  aria-label="Refresh polygons"
                  @click="emit('refresh-list')"
                />
              </div>

              <PoligonosFloatingPanel
                :loading="isLoadingPolygons"
                :deleting-id="deletingPoligonoId"
                :poligonos="savedPoligonos"
                class="min-w-0 w-full max-w-full"
                @delete="(id) => emit('delete', id)"
              />
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>

    <p class="mt-2 text-xs text-[var(--app-muted)]">
      Configure the vendors and point count before generating polygons.
    </p>
  </aside>
</template>

<style scoped lang="scss">
.map-sidebar-accordion {
  :deep(.p-accordionpanel) {
    border: 1px solid var(--app-border);
    border-radius: 0.75rem;
    background: var(--app-surface);
    overflow: hidden;
    min-height: 0;
  }

  :deep(.p-accordioncontent-wrapper){
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
  }

  :deep(.p-accordionheader) {
    border: 0;
  }

  :deep(.p-accordionheader-link) {
    padding: 0.9rem 1rem;
    background: var(--app-surface);
  }

  :deep(.p-accordioncontent-content) {
    padding: 0px;
    background: transparent;
    min-height: 0;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }
}

.generate-polygons-button {
  width: 100%;
  justify-content: center;
  border: 1px solid rgba(180, 83, 9, 0.28) !important;
  background: linear-gradient(135deg, #f59e0b 0%, #ea580c 100%) !important;
  color: #fff7ed !important;
  box-shadow: 0 12px 24px rgba(234, 88, 12, 0.2);
}

.generate-polygons-button:hover:not(:disabled) {
  border-color: rgba(154, 52, 18, 0.4) !important;
  background: linear-gradient(135deg, #fbbf24 0%, #f97316 100%) !important;
}

.generate-polygons-button:disabled {
  opacity: 0.65;
  box-shadow: none;
}
</style>

<script setup lang="ts">
import { computed } from 'vue'

import type { VendedorItem } from '../../services/vendedores.service'

const props = defineProps<{
  loading: boolean
  vendedores: VendedorItem[]
  selection: VendedorItem[]
}>()

const emit = defineEmits<{
  (event: 'refresh'): void
  (event: 'update:selection', value: VendedorItem[]): void
}>()

const selectionProxy = computed({
  get: () => props.selection,
  set: (value) => emit('update:selection', value),
})

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
  <section aria-label="Vendors panel" class="min-w-0 w-full">
    <div v-if="loading" class="py-3 text-sm text-[var(--app-muted)]">
      Loading vendors...
    </div>

    <div v-else-if="vendedores.length === 0" class="rounded-lg border border-dashed border-[var(--app-border)] p-3 text-sm text-[var(--app-muted)]">
      No vendors yet.
    </div>

    <div v-else class="min-w-0 w-full overflow-hidden rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]">
      <DataTable
        :value="vendedores"
        v-model:selection="selectionProxy"
        data-key="id"
        paginator
        scrollable
        scroll-height="260px"
        selection-mode="multiple"
        selection-page-only
        :rows="10"
        :rows-per-page-options="[10, 20]"
        striped-rows
        class="vendors-table vendors-table--compact w-full"
        table-style="width: 100%; table-layout: fixed"
      >
        <Column selectionMode="multiple" headerStyle="width: 3rem" />
        <Column field="codigo" header="Código" sortable style="width: 34%" />
        <Column field="nombre" header="Nombre" sortable />
      </DataTable>
    </div>
  </section>
</template>

<style scoped lang="scss">
.vendors-table {
  min-width: 0;

  :deep(.p-datatable-table) {
    color: var(--p-text-color);
    font-size: 0.8rem;
    width: 100%;
    table-layout: fixed;
  }

  :deep(.p-datatable-thead > tr > th),
  :deep(.p-datatable-tbody > tr > td) {
    padding: 0.45rem 0.65rem;
    border-color: var(--p-content-border-color);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  :deep(.p-datatable-thead > tr > th) {
    background: var(--p-paginator-nav-button-selected-background);
    color: var(--p-text-muted-color);
    font-size: 0.74rem;
    line-height: 1.1rem;
  }

  :deep(.p-datatable-tbody > tr > td) {
    color: var(--p-text-color);
  }

  :deep(.p-datatable-wrapper) {
    max-height: 260px;
    overflow-x: hidden;
  }

  :deep(.p-paginator) {
    border-top: 1px solid var(--p-content-border-color);
    color: var(--p-text-muted-color);
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>
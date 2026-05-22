<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { listVendedores, type VendedorItem } from '../services/vendedores.service'

const vendedores = ref<VendedorItem[]>([])
const selectedVendedores = ref<VendedorItem[]>([])
const isLoading = ref(false)

const loadVendedores = async () => {
  isLoading.value = true

  try {
    vendedores.value = await listVendedores()
  } catch {
    vendedores.value = []
  } finally {
    isLoading.value = false
  }
}

const onUpdateSelection = (value: VendedorItem[]) => {
  selectedVendedores.value = value
}

onMounted(() => {
  void loadVendedores()
})
</script>

<template>
  <section class="p-4 sm:p-6">
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="m-0 text-xs uppercase tracking-[0.12em] text-[var(--app-muted)]">Catalog</p>
        <h1 class="m-0 text-2xl font-bold text-[var(--app-title)]">Vendedores</h1>
        <p class="mt-1 text-sm text-[var(--app-muted)]">
          Lista global de vendedores con paginación de 10 en 10.
        </p>
      </div>

      <Button
        label="Refresh"
        icon="pi pi-refresh"
        outlined
        :loading="isLoading"
        @click="loadVendedores"
      />
    </div>

    <VendedoresFloatingPanel
      :loading="isLoading"
      :vendedores="vendedores"
      :selection="selectedVendedores"
      @update:selection="onUpdateSelection"
      @refresh="loadVendedores"
    />
  </section>
</template>
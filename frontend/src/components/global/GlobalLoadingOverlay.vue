<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useGlobalLoadingStore } from '../../stores/global-loading.store'

const loadingStore = useGlobalLoadingStore()
const { isActive, title, message, progress } = storeToRefs(loadingStore)
</script>

<template>
  <transition name="global-loading-fade">
    <div
      v-if="isActive"
      class="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/75 px-4"
    >
      <div class="w-[min(460px,100%)] rounded-2xl border border-white/15 bg-slate-900/90 p-6 shadow-[0_28px_55px_rgba(0,0,0,0.45)] backdrop-blur-sm">
        <div class="mb-5 flex items-center gap-4">
          <img src="/logo.svg" alt="Proyecto Coordenadas logo" class="h-12 w-12 shrink-0" />
          <div>
            <p class="m-0 text-xs uppercase tracking-[0.12em] text-slate-300">{{ title }}</p>
            <p class="m-0 mt-1 text-sm text-slate-200">{{ message }}</p>
          </div>
        </div>

        <ProgressBar :value="progress" :show-value="false" style="height: 0.65rem" />
        <p class="m-0 mt-2 text-right text-xs font-semibold text-slate-300">{{ Math.round(progress) }}%</p>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.global-loading-fade-enter-active,
.global-loading-fade-leave-active {
  transition: opacity 0.22s ease;
}

.global-loading-fade-enter-from,
.global-loading-fade-leave-to {
  opacity: 0;
}
</style>

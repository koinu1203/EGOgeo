<script setup lang="ts">
import GlobalLoadingOverlay from './components/global/GlobalLoadingOverlay.vue'
</script>

<template>
  <div
    class="min-h-screen bg-[var(--app-bg)]"
  >
    <RouterView />
    <GlobalLoadingOverlay />
  </div>
</template>

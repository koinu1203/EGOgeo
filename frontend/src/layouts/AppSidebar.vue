<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    compact?: boolean
  }>(),
  {
    compact: false,
  },
)

const emit = defineEmits<{
  (event: 'toggle-compact'): void
}>()

type NavItem = {
  to: string
  label: string
  icon: string
}

const navItems: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: 'pi pi-home',
  },
  {
    to: '/clientes',
    label: 'Clientes',
    icon: 'pi pi-users',
  },
  {
    to: '/poligonos',
    label: 'Poligonos',
    icon: 'pi pi-map',
  },
  {
    to: '/vendedores',
    label: 'Vendedores',
    icon: 'pi pi-briefcase',
  },
  {
    to: '/reportes',
    label: 'Reportes',
    icon: 'pi pi-chart-bar',
  },
  {
    to: '/configuracion',
    label: 'Configuracion',
    icon: 'pi pi-cog',
  },
]

const sidebarClass = computed(() =>
  props.compact
    ? 'fixed inset-x-0 bottom-0 z-40 flex flex-row gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:static md:w-20 md:flex-col md:items-center md:border-r md:border-b-0 md:border-t-0 md:p-3 md:transition-[width,padding] md:duration-300 md:ease-in-out'
    : 'fixed inset-x-0 bottom-0 z-40 flex flex-row gap-2 border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:static md:w-60 md:flex-col md:border-r md:border-b-0 md:border-t-0 md:transition-[width,padding] md:duration-300 md:ease-in-out',
)

const linkClass = computed(() =>
  props.compact
    ? 'inline-flex h-11 min-w-0 flex-1 items-center justify-center rounded-lg text-base text-[var(--app-muted)] transition hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-hover-text)] md:w-auto md:flex-none md:justify-start md:px-3 md:py-2 md:text-sm md:font-semibold'
    : 'inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[var(--app-muted)] transition hover:bg-[var(--app-nav-hover-bg)] hover:text-[var(--app-nav-hover-text)] md:w-full md:flex-none md:justify-start md:gap-3',
)

const activeClass = 'bg-[var(--app-nav-active-bg)] text-[var(--app-nav-active-text)]'

const isNavLinkActive = (isActive: boolean, isExactActive: boolean) => isActive || isExactActive

const toggleIcon = computed(() => (props.compact ? 'pi pi-chevron-right' : 'pi pi-chevron-left'))

const toggleLabel = computed(() => (props.compact ? 'Expand navigation' : 'Compact navigation'))

const labelClass = computed(() =>
  props.compact
    ? 'ml-0 w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-200 ease-out'
    : 'hidden overflow-hidden whitespace-nowrap opacity-100 transition-all duration-200 ease-out md:ml-0.5 md:inline md:w-auto',
)
</script>

<template>
  <aside class="app-sidebar relative" :class="sidebarClass" aria-label="Main navigation">
    <div class="absolute -right-3 z-10 hidden md:block">
        <Button
        :icon="toggleIcon"
        text
        rounded
        class="sidebar-toggle-btn !h-[20px] !w-[20px] !min-w-[20px] !p-0"
        :aria-label="toggleLabel"
        :title="toggleLabel"
        @click="emit('toggle-compact')"
      />
    </div>
    
    <nav class="flex w-full items-center gap-2 md:flex-col" aria-label="Main navigation links">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        custom
        v-slot="{ href, navigate, isActive, isExactActive }"
      >
        <a
          :href="href"
          :class="[linkClass, isNavLinkActive(isActive, isExactActive) ? activeClass : '']"
          :aria-label="item.label"
          @click="navigate"
        >
          <i :class="item.icon" aria-hidden="true"></i>
          <span :class="labelClass">{{ item.label }}</span>
          <span class="sr-only">{{ item.label }}</span>
        </a>
      </RouterLink>
    </nav>
  </aside>
</template>

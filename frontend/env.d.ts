/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_BASE_URL: string
	readonly VITE_GOOGLE_MAPS_API_KEY: string
	readonly VITE_GOOGLE_MAPS_MAP_ID?: string
	readonly VITE_GOOGLE_MAPS_SHOW_SUCCESS_BANNER?: string
	readonly VITE_DEBUG_MAP_RECURSION?: string
}

interface ImportMeta {
	readonly env: ImportMetaEnv
}
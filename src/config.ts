// When VITE_API_URL is set the app runs against the real backend (auth + DB).
// Otherwise it falls back to the in-memory mock so the demo always works with zero config.
const env = import.meta.env as unknown as Record<string, string | undefined>
export const API_URL: string | undefined = env.VITE_API_URL
export const USE_BACKEND = Boolean(API_URL)

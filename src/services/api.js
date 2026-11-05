export const USE_MOCK =
  import.meta.env.MODE === 'test' ||
  Boolean(import.meta.env.VITEST) ||
  import.meta.env.VITE_USE_MOCK === 'true'

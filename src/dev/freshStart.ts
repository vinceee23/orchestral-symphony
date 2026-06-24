/// <reference types="vite/client" />
// DEV-only: wipe the saved game on every page load so each playtest starts fresh.
// Imported FIRST in main.tsx so it runs before the zustand store hydrates from localStorage.
// Production (the Electron release build) is untouched — saves persist there.
if (import.meta.env.DEV) {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('orchestral-symphony')) localStorage.removeItem(k)
  }
  // eslint-disable-next-line no-console
  console.info('[dev] fresh playtest — saved game wiped')
}

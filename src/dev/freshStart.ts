/// <reference types="vite/client" />
// DEV-only, OPT-IN: wipe the saved game ONLY when the URL asks for it (load /?fresh).
// Normal refreshes keep your playtest save. Imported first in main.tsx (before the store hydrates).
if (import.meta.env.DEV && /(?:[?&#])fresh\b/.test(location.search + location.hash)) {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('orchestral-symphony')) localStorage.removeItem(k)
  }
  // eslint-disable-next-line no-console
  console.info('[dev] /?fresh — saved game wiped for a clean playtest')
}

// OPT-IN save wipe: clears the saved game ONLY when the URL asks for it (load with ?fresh).
// Works in dev AND production so playtesters can restart cleanly. A normal refresh keeps your save.
// Imported first in main.tsx (before the store hydrates). After wiping we strip the `fresh` flag from
// the URL so a subsequent reload doesn't keep re-wiping the new playthrough.
if (/(?:[?&#])fresh\b/.test(location.search + location.hash)) {
  for (const k of Object.keys(localStorage)) {
    if (k.startsWith('orchestral-symphony')) localStorage.removeItem(k)
  }
  try {
    const url = new URL(location.href)
    url.searchParams.delete('fresh') // the documented path: ?fresh
    url.hash = url.hash.replace(/([?&#])fresh\b&?/g, '$1').replace(/[?&#]+$/, '')
    history.replaceState(null, '', url.pathname + url.search + url.hash)
  } catch {
    /* history/URL unavailable — harmless, the wipe already happened */
  }
  // eslint-disable-next-line no-console
  console.info('[playtest] ?fresh — saved game wiped for a clean start')
}

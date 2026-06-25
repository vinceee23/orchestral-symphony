// OPT-IN dev shortcuts (load before the store hydrates):
//   ?fresh — wipe saved game for a clean start
//   ?l3    — handled in gameStore onRehydrate: unlock World Tour + seed catalogue (see gameStore.ts)
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

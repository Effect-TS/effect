---
"@effect/atom-vue": patch
---

Fix `useAtomRef` returning a stale value after its reactive selector switches refs. The returned Vue ref now reflects the newly selected ref's current value without requiring another write.

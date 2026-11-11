---
"@effect/atom-solid": patch
---

Fix `useAtomValue`, `useAtom` and `useAtomRef` calling function values as Solid signal updaters instead of returning them.

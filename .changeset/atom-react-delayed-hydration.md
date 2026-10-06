---
"@effect/atom-react": patch
---

Keep atom server snapshots stable while hydrated readers are subscribed, so Suspense boundaries that hydrate after an atom changes no longer cause hydration mismatches. Selector reads in `useAtomValue` now derive their server snapshot from the source atom.

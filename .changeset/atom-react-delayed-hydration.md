---
"@effect/atom-react": patch
---

Keep atom server snapshots stable while hydrated readers are subscribed, so Suspense boundaries that hydrate after an atom changes no longer cause hydration mismatches. `useAtomValue` selectors are now applied to the source atom's value instead of creating a mapped atom per component.

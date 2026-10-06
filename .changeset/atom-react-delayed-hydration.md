---
"@effect/atom-react": patch
---

Fix hydration mismatches in delayed Suspense boundaries by sharing a stable server snapshot across atom readers, including `useAtomValue` selectors.

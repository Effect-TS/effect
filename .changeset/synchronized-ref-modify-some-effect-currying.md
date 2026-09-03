---
"effect": patch
---

Fix the curried `SynchronizedRef.modifySomeEffect` overload to accept only the callback, matching its existing runtime behavior. Replace `modifySomeEffect(fallback, pf)(ref)` with `modifySomeEffect(pf)(ref)`; the callback's tuple supplies the result whether or not the ref is updated. The obsolete fallback form is now rejected by TypeScript instead of being accepted and crashing at runtime.

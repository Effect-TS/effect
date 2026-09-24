---
"effect": patch
---

Defer stale-while-revalidate refreshes until after atom reads finish. Skip queued refreshes if the source is fresh or the atom is disposed. One-shot, unmounted `registry.get` reads no longer refresh stale sources if their lifetime ends before revalidation runs.

---
"effect": patch
---

Fix scheduler task draining to isolate `AsyncLocalStorage` across fibers.

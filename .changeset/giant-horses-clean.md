---
"effect": patch
---

Fix `Runtime.runPromise` to isolate `AsyncLocalStorage` across concurrent calls.

---
"effect": patch
---

Remove the `AbortSignal` listener added by `Effect.runPromise` / `Runtime.runPromiseExit` once the fiber completes, fixing `MaxListenersExceededWarning` when a signal is reused across runs (e.g. `it.effect.prop`).

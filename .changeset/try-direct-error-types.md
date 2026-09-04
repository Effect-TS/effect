---
"effect": patch
---

Correct the error types of `Effect.try` and `Effect.tryPromise`. Direct function forms retain `Cause.UnknownError`, while `{ try, catch }` options use the error type returned by `catch`. Union-valued arguments that may be direct functions include `Cause.UnknownError` in their error channel.

Direct or union-call annotations that previously omitted `Cause.UnknownError` may no longer compile. Use `{ try, catch }` with a real error mapper to produce your intended error type, or update the annotation to include the actual error channel. Explicit two-generic direct calls such as `Effect.try<A, E>(thunk)` conservatively return `Effect<A, E | Cause.UnknownError>`; specifying `E` does not map the error. The same applies to `Effect.tryPromise`.

Runtime behavior, callback arguments, and error mapping are unchanged.

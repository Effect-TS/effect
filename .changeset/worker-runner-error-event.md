---
"@effect/platform-browser": patch
"@effect/platform-deno": patch
"@effect/platform-node": patch
---

Fix WorkerRunner `onError` handler reading `error.data` instead of `error.error` on ErrorEvent, and correct grammar in messageerror error messages.

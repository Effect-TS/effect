---
"effect": patch
---

Allow RPC handlers to fail with their server middleware's errors without repeating them in the RPC's `error` schema.

- Handlers returned by `RpcGroup.accessHandler` can now fail with those middleware errors. Handle them, or widen error types that previously allowed only the RPC's own errors.

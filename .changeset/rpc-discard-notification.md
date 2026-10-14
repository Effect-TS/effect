---
"effect": minor
---

Calls made with `discard: true` now complete when the server acknowledges them, instead of when the request is written. The request carries a new `discard` marker, and `RpcServer` acknowledges it with a successful `Exit` once the handler starts, after the middleware has run. It sends no result, `Chunk` or `Defect` for the call after that, and reports handler failures locally. A failure before the acknowledgement fails only that call. Over HTTP and workers the call still completes after the handler has finished. `RpcServer` also stops replying to JSON-RPC notifications, and overlapping JSON-RPC notifications no longer collide on their shared empty id.

SchemaBinary peers must be upgraded together because the new `discard` field changes the envelope fingerprint.

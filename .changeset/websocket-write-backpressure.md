---
"effect": minor
"@effect/platform-deno": minor
---

Add WebSocket write backpressure with a default 64 KiB high-water mark, configurable through `writeHighWaterMark` or `Socket.WriteHighWaterMark`. Writes and batches wait for the transport's outgoing buffer to drain; use `Infinity` to preserve unbounded writes. Custom WebSocket adapters without `bufferedAmount` retain their existing behavior.

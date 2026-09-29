---
"@effect/platform-bun": minor
---

Add `BunDatagramSocket` with `make`, `fromUdpSocket`, `layer` and a native UDP benchmark. Adopting a socket replaces its `data`, `drain` and `error` handlers. Requires Bun 1.4 or later for `false`/`drain` send backpressure.

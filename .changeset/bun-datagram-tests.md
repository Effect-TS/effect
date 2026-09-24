---
"@effect/platform-bun": minor
---

Add `BunDatagramSocket`, a native `Bun.udpSocket` adapter for `effect/socket/DatagramSocket`, with `make`, `fromUdpSocket` and `layer`. `make` and `fromUdpSocket` return an `Effect` of the socket, and `fromUdpSocket` runs its `acquire` effect with the caller's services and replaces the adopted socket's `data`, `drain` and `error` handlers. It requires Bun 1.4 or later, which reports a full kernel send buffer through `false` and `drain` instead of throwing `EAGAIN`. `@effect/platform-bun` also gets a `benchmark:datagram` script that compares it with raw `Bun.udpSocket`.

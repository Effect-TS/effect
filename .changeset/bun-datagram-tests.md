---
"@effect/platform-bun": minor
---

Add `BunDatagramSocket`, a native `Bun.udpSocket` adapter for `effect/socket/DatagramSocket`. `make` and `fromUdpSocket` return an `Effect` of the socket, as `NodeDatagramSocket` does, and `fromUdpSocket` captures the caller's services for its `acquire` effect; `layer` provides the service. It requires Bun 1.4 or later, which reports a full kernel send buffer through `false` and `drain` instead of throwing `EAGAIN`.

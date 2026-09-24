---
"@effect/platform-bun": minor
---

Add `BunDatagramSocket`, a native `Bun.udpSocket` adapter for `effect/socket/DatagramSocket` with `make`, `fromUdpSocket` and `layer`. It requires Bun 1.4 or later, which reports a full kernel send buffer through `false` and `drain` instead of throwing `EAGAIN`.

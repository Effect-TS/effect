---
"@effect/platform-node": minor
"@effect/platform": minor
---

Add UDP Socket support with platform-agnostic interface and Node.js implementation

Introduces comprehensive UDP socket functionality following the existing Socket API patterns:

- Platform-agnostic UdpSocket interface in @effect/platform
- Node.js implementation using dgram module in @effect/platform-node
- Support for sending/receiving datagrams with sender address information
- Proper resource management with Effect's acquireRelease pattern
- Comprehensive error handling for bind, send, and receive operations
- Full test coverage including edge cases and cleanup scenarios

UDP sockets are message-oriented and connectionless, unlike TCP's stream-oriented approach. Each datagram includes complete
sender information, enabling flexible communication patterns for real-time applications, game networking, and distributed
systems.

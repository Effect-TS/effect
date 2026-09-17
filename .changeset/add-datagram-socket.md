---
"effect": patch
"@effect/platform-node": patch
---

Add `DatagramSocket` in `effect/unstable/socket` and `NodeDatagramSocket` in `@effect/platform-node` for scoped UDP sockets, including connected peers, packet readers and writers, bounded receive buffering, and stream and channel adapters.

Socket scopes own endpoint cleanup, while interrupting individual reads or writes leaves the endpoint open. Connected peers must have a nonzero port and a specified IP address, including when using IPv4-mapped IPv6 addresses.

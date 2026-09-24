---
"@effect/platform-deno": minor
---

Add `DenoDatagramSocket`, a native `Deno.listenDatagram` adapter for `effect/socket/DatagramSocket` `make` and `fromDatagramConn` return an `Effect` of the socket, as `NodeDatagramSocket` does, and `fromDatagramConn` captures the caller's services for its `acquire` effect; `layer` provides the service. It resolves hostnames through the system resolver with `node:dns` `lookup`, mapping denied DNS access to `PermissionDenied`. Batch sends submit datagrams sequentially and stop at the first send failure; UDP arrival order is not guaranteed. It needs `--unstable-net` or `"net"` in the `"unstable"` list of `deno.json`, and reports a `DatagramSocketUnsupportedError` when a reader opens without it.

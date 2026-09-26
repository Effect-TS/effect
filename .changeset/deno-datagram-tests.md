---
"@effect/platform-deno": minor
---

Add `DenoDatagramSocket`, a native `Deno.listenDatagram` adapter for `effect/socket/DatagramSocket`, with `make`, `fromDatagramConn` and `layer`. `make` and `fromDatagramConn` return an `Effect` of the socket, and `fromDatagramConn` runs its `acquire` effect with the caller's services. Hostnames are resolved with `node:dns` `lookup`, and denied DNS access is reported as `PermissionDenied`. `writeAll` sends one datagram at a time and stops at the first failure; UDP arrival order is not guaranteed. The adapter needs `--unstable-net`, or `"net"` in the `"unstable"` list of `deno.json`, and fails a reader with `DatagramSocketUnsupportedError` without it. `@effect/platform-deno` also gets a `benchmark:datagram` script that compares it with raw `Deno.listenDatagram`.

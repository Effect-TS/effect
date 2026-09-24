---
"@effect/platform-deno": minor
---

Add `DenoDatagramSocket`, a native `Deno.listenDatagram` adapter for `effect/socket/DatagramSocket` with `make`, `fromDatagramConn` and `layer`. It resolves hostnames through the system resolver with `node:dns` `lookup`. It needs `--unstable-net` or `"net"` in the `"unstable"` list of `deno.json`, and reports a `DatagramSocketUnsupportedError` when a reader opens without it.

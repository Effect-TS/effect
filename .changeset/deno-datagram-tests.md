---
"@effect/platform-deno": minor
---

Add `DenoDatagramSocket` with `make`, `fromDatagramConn`, `layer` and a native UDP benchmark. Requires `--unstable-net` or `"unstable": ["net"]`; without it, reader acquisition fails with `DatagramSocketUnsupportedError`. `writeAll` sends sequentially and stops at the first failure.

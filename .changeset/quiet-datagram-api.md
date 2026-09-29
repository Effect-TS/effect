---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-node": minor
"@effect/platform-bun": minor
"@effect/platform-deno": minor
---

Add scoped `DatagramSocket` UDP support and a trusted native `NetAddress` constructor. Add Node, Bun, and Deno adapters with native UDP benchmarks. Bun requires 1.4 or later; adopting a Bun socket replaces its handlers. Deno requires `--unstable-net` or `"unstable": ["net"]`.

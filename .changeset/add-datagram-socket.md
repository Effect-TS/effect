---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-deno": patch
"@effect/platform-bun": patch
---

Add scoped, family-typed `DatagramSocket` support with explicit `Unassociated` and `Associated` endpoint variants, bounded buffering, resilient UDP receive handling, native IPv4-address / IPv6-index multicast selection including `setMulticastInterface`, ordered grouped sends with exact accepted-prefix errors, IPv6-only bindings, and Node, Deno, and Bun adapters backed by `node:dgram`.

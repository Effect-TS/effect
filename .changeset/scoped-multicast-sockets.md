---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add `Multicast.bind` for scoped UDP multicast acquisition with static memberships, outgoing interface selection, multicast hop limits, loopback control, and address reuse. Returned endpoints use the existing `DatagramSocket` packet and streaming APIs. Provide Node.js and Bun adapters and an IPv4-only Deno adapter.

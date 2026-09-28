---
"effect": patch
---

Store `NetAddress` IPv4 and IPv6 addresses as numbers instead of a `Uint8Array`, making construction, `Equal` and `Hash` cheaper, especially on Deno.

---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-node": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Accept address inputs in `Dns.reverse` and name server inputs in the Node, Bun, and Deno `Dns` services. Add `Dns.nameServerFromString` and `Dns.nameServerFromInput`, which convert name servers given as strings such as `"1.1.1.1"` or `"[2001:db8::53]:5353"`, IP addresses, or internet addresses, using port 53 when none is given.

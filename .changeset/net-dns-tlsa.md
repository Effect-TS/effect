---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Add TLSA records to `effect/net/Dns`, with a `Schema.DnsTlsaRecord` schema whose JSON codec encodes the certificate association data as hex. The Node.js `Dns` service queries them with `resolveTlsa` (Node.js 22.15 or 23.9 and later); Bun, Deno, and older Node.js versions fail TLSA queries with `Unsupported`.

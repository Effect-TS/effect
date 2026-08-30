---
"effect": patch
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
"@effect/platform-bun": patch
---

Add platform-neutral MAC, IP, internet, and Unix socket address values under `effect/unstable/net/Net`, with strict parsing, canonical formatting, checked and unsafe construction, classification, equality, hashing, and matching `effect/Schema` codecs.

HTTP and socket servers now expose `Net.SocketAddress`. Replace their TCP address types with `Net.InetAddress`, use `address` instead of `hostname`, and replace Unix address types with `Net.UnixPathAddress`. Bun listeners now require a numeric IP literal; native conversion failures remain typed server-open errors, and IPv6 authorities are formatted with brackets.

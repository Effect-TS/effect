---
"effect": patch
"@effect/sql-pg": patch
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
"@effect/platform-bun": patch
---

Add platform-neutral network values under `effect/unstable/net`: `NetAddress` for MAC, IP, internet, and Unix socket addresses; `IpInterface` for host addresses that preserve their prefix and host bits; and `IpNetwork` for canonical IPv4 and IPv6 CIDR values. These modules provide strict parsing, canonical formatting, checked and unsafe construction, equality, hashing, matching unstable `effect/Schema` codecs, and network operations including containment, overlap, exact bounds, and address counts.

Add `NetAddress.SocketAddress.Input` and checked and unsafe constructors for normalizing concrete socket address configuration. HTTP and socket servers now accept these inputs and expose canonical `NetAddress.SocketAddress` values. Replace their TCP address types with `NetAddress.InetAddress`, use `address` instead of `hostname`, and replace Unix address types with `NetAddress.UnixPathAddress`. Bun listener hostnames continue to resolve before binding; native conversion failures remain typed server-open errors, and IPv6 authorities are formatted with brackets. Servers bound to the IPv6 unspecified address now log addresses such as `http://[::]:3000` instead of substituting `0.0.0.0`.

PostgreSQL `inet` now uses `IpInterface`, while `cidr` enforces canonical network addresses and continues to accept bare addresses with their full-width prefix.

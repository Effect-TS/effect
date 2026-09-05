---
"effect": patch
"@effect/sql-pg": patch
"@effect/platform-node": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
"@effect/platform-bun": patch
---

Add platform-neutral network address modules under `effect/unstable/net`:

- `NetAddress` provides MAC, IP, internet, and Unix socket addresses.
- `IpInterface` provides IP host addresses that preserve their prefix lengths and host bits.
- `IpNetwork` provides canonical IPv4 and IPv6 CIDR networks, including containment, overlap, bounds, and address counts.

HTTP and socket servers now expose canonical `NetAddress.SocketAddress` values. TCP addresses use `NetAddress.InetAddress` with an `address` field instead of `hostname`, and Unix addresses use `NetAddress.UnixPathAddress`. IPv6 URL authorities are bracketed. A server bound to `::` now logs `http://[::]:3000` instead of `http://0.0.0.0:3000`.

Bun continues to resolve listener hostnames before binding. Bun and Deno HTTP server layers can now fail with `ServeError` when their native listener address cannot be converted to a `NetAddress`.

PostgreSQL `inet` now uses `IpInterface`. The `cidr` codec rejects addresses with host bits set and still treats a bare address as a full-width network.

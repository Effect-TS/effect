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

IP address constructors copy their input bytes, including Node.js Buffers, so mutating the input cannot change stored addresses, equality, or hashes. Network address values serialize to canonical strings through `toJSON`, keeping private bytes out of JSON output. `NetAddressError.input` retains the original failing input, including complete socket and CIDR strings. The new network schemas in `Schema` are marked unstable, and their string codecs expose named interfaces.

HTTP and socket servers now expose canonical `NetAddress.SocketAddress` values. TCP addresses use `NetAddress.InetAddress` with an `address` field instead of `hostname`, and Unix addresses use `NetAddress.UnixPathAddress`. IPv6 URL authorities are bracketed. A server bound to `::` now logs `http://[::]:3000` instead of `http://0.0.0.0:3000`, and HTTP test clients retain the IPv4 loopback fallback for unspecified listeners, including dual-stack IPv6. `HttpServer.formatAddress` and `HttpServer.makeTestClient` reject scoped IPv6 addresses because WHATWG URLs cannot preserve their interface scope.

Bun continues to resolve listener hostnames before binding and treats an explicitly undefined `unix` option as a TCP listener. Bun and Deno HTTP server layers can now fail with `ServeError` when their native listener address cannot be converted to a `NetAddress`.

PostgreSQL `inet` now uses `IpInterface`. The `cidr` codec rejects addresses with host bits set and still treats a bare address as a full-width network. Network encoding errors include the original value, PostgreSQL type, and validation failure.

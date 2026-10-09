---
"effect": patch
---

Add `fromInput` constructors to the `effect/net` data types that accept a value or any form its checked constructors take: a string, octets, segments, bytes, or parts such as `{ address, port }`, `{ address, prefixLength }`, and `{ host, port }`. For example `NetAddress.ipFromInput([192, 0, 2, 1])`, `Host.hostPortFromInput({ host: "example.com", port: 443 })`, and `IpNetwork.fromInput("10.0.0.0/8")`. `NetAddress.SocketAddress.Input` and `AddressResolver.resolve` accept the same forms.

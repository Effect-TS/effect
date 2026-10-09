---
"effect": patch
---

Add `*Input` types and `fromInput` functions to the `effect/net` data types. Each input is the value itself or a string to parse, and `fromInput` returns values unchanged and parses strings with the matching `fromString` parser, for example `NetAddress.ipFromInput`, `NetAddress.inetAddressFromInput`, `Host.hostPortFromInput`, `IpNetwork.fromInput`, and `IpInterface.fromInput`. Where the string parser has an `Unsafe` variant, `fromInput` has a throwing `Unsafe` variant too.

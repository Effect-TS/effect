---
"effect": patch
---

Add `fromInput` constructors to the `effect/net` data types.

`NetAddress.socketAddressFromInput` now accepts the same address inputs and applies an IPv6 `scopeId`; a nonzero `scopeId` on an IPv4 address is rejected.

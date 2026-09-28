---
"effect": patch
---

Add `NetAddress.formatHost` and `NetAddress.inetAddressFromHostString` for socket APIs that accept numeric hosts and ports separately, preserving IPv6 scope IDs. Add `NetAddress.scopeIdsFromInterfaces` to build a scope map for resolving named IPv6 zones from supplied network interface entries without performing operating-system lookups.

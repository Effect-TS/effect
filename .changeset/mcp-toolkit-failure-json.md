---
"effect": patch
---

Fix `McpServer` toolkit results for declared failures whose encoded value is not JSON. A failure schema containing a `Schema.BigInt` made the call return the generic internal error, and `Map`, `Set` or `Option` values in a failure reached the client as `{}` or debug output. Declared failures are now encoded with the failure schema's JSON codec, as successes are since #10089. As with successes, a failure value that has no JSON encoding, such as a `Schema.Unknown` field holding a class instance or `Date`, now returns the generic tool error and is logged instead of being sent in a lossy form, and an optional field set to `undefined` is sent as `null`.

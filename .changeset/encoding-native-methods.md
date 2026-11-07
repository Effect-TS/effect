---
"effect": patch
---

Speed up `Base64.decode`, `Base64Url` and `Hex` by using the native `Uint8Array` Base64 and hex methods when the runtime provides them. `Base64Url.encode` is also faster on runtimes without them.

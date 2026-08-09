---
"effect": patch
---

Add `Channel.mkUint8Array` and reuse it from `Stream` and multipart file collection, keeping streamed byte concatenation linear across upstream pulls.

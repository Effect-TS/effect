---
"effect": patch
---

Mark OpenAPI parameters and response headers as optional when their encoded key is optional, such as keys using `Schema.withDecodingDefaultKey` or `Schema.withDecodingDefault`. Generated documents previously marked these keys as required, even though they can be absent on the wire.

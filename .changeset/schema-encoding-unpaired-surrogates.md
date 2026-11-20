---
"effect": patch
---

Report `SchemaIssue.InvalidValue` when `SchemaGetter.encodeBase64`, `encodeBase64Url`, `encodeHex`, or `encodeUriComponent` encounters an unpaired UTF-16 surrogate during encoding.

---
"effect": patch
---

Fail in-progress multipart file part streams when a parser limit (such as `maxTotalSize`) is exceeded mid-file, instead of hanging indefinitely, and stop masking those parser errors as `InternalError` in `Multipart.toPersisted`.

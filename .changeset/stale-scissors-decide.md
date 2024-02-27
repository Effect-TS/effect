---
"@effect/schema": patch
---

JSONSchema: prune `UndefinedKeyword` if the property signature is marked as optional and contains a union that includes `UndefinedKeyword`, closes #2068

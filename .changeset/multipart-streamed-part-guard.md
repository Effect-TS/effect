---
"effect": patch
---

Fix `Multipart.isPart` to recognize only a text `Field` or streamed `File`, matching the `Part` type. It now rejects `PersistedFile` values; use `Multipart.isPersistedFile` to recognize persisted files.

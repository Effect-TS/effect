---
"effect": patch
---

Fix `FileSystem.sink` to default to write mode when options explicitly contain `flag: undefined`, matching omitted flags. On Node.js, this avoids failures when creating a new file or writing to an existing one. Explicit flags such as append remain unchanged.

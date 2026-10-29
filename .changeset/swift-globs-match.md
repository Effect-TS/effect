---
"effect": patch
---

Speed up `Glob.match` by tracking match states as a bitmask and reading path segments without splitting the path. Patterns such as `*.ts` that are a literal prefix and suffix around one `*` are also checked without backtracking, which helps `FileSystem.glob` too.

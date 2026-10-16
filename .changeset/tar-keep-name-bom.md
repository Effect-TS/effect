---
"effect": patch
---

Keep a leading byte order mark in Tar entry names, so that a name such as `"\uFEFF/etc/passwd"` no longer decodes as the absolute path `/etc/passwd`.

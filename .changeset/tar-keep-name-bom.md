---
"effect": patch
---

Fix `Tar.decode` dropping a leading byte order mark from entry names, link targets and PAX keys, so a name such as `"\uFEFF/etc/passwd"` no longer decodes as `/etc/passwd`.

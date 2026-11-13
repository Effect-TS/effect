---
"effect": patch
---

Fix `DateTime.make` ignoring a time zone followed by a comment or trailing whitespace, such as `17:14:06 -0500 (EST)`.

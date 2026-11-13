---
"effect": patch
---

Fix `DateTime.make` ignoring a time zone that follows the time and is itself followed by a comment or trailing whitespace, such as `17:14:06 -0500 (EST)`.

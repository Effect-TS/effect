---
"effect": patch
---

Preserve the supplied time zone identifier in `DateTime` named zones, including aliases such as `Europe/Kyiv` or `Etc/UTC`, instead of the identifier Intl resolves them to (`Europe/Kiev`, `UTC`).

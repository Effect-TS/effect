---
"effect": patch
---

Fix `DateTime.make` rejecting date strings that end in `UT`, `UTC` or a US time zone abbreviation such as `PDT`.

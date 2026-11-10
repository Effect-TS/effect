---
"effect": patch
---

Fix `DateTime.make` rejecting strings that end in `UT`, `UTC` or a US zone abbreviation such as `PDT`, which `Date.parse` accepts.

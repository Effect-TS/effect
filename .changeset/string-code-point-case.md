---
"effect": patch
---

Fix `String.capitalize` and `String.uncapitalize` to case the first Unicode code point, so astral letters such as `"𐐨"` are cased correctly.

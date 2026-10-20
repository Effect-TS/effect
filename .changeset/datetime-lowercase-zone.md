---
"effect": patch
---

Accept lowercase `z` and `gmt` zone designators in `DateTime.make` and `DateTime.makeUnsafe`. These strings previously had a second `Z` appended and were rejected.

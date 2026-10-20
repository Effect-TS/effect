---
"effect": patch
---

`DateTime.make` and `DateTime.makeUnsafe` accept lowercase `z` and `gmt` designators that `Date.parse` already accepts, instead of appending a second `Z` and rejecting the string.

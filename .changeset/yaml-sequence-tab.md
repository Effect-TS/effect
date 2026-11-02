---
"effect": patch
---

`Yaml.parse` and `Yaml.parseAll` now read a tab after a block sequence's `-` as separation, so `-\tvalue` is a sequence entry instead of the string `"-\tvalue"`, and a tab before a compact block sequence or mapping after the dash (`-\t- value`, `-\tkey: value`) fails.

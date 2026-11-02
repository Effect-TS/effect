---
"effect": minor
---

`Yaml.parse` and `Yaml.parseAll` now support compact nested block sequences, where a sequence entry starts another sequence on the same line (`- - value`), and quoted scalars that span lines inside flow collections (`["first` followed by `second"]`). Both used to fail.

A block sequence written on the same line as a mapping key, such as `key: - value`, now fails as invalid YAML instead of being read as the string `"- value"`.

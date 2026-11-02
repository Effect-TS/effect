---
"effect": patch
---

`Yaml.parse` and `Yaml.parseAll` now accept a backslash followed by a literal tab in double-quoted scalars as an escaped tab, instead of failing with "Invalid YAML escape".

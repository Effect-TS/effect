---
"effect": patch
---

`Yaml.parse` and `Yaml.parseAll` now reject a flow collection item, key or value that starts with `-` followed by white space, a line break or a flow indicator, such as `[- 1]` or `[1, -]`, instead of reading it as the string `"- 1"` or `"-"`.

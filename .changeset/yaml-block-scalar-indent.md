---
"effect": patch
---

Fix `Yaml.parse` block scalars taking their indentation from the least indented line, which pulled less indented comments into the value.

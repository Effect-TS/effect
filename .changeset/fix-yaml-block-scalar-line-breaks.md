---
"effect": patch
---

Fix `Yaml.parse` dropping the last line break of a kept (`|+`, `>+`) block scalar followed by more content, and returning `"\n"` instead of `""` for an empty block scalar.

---
"effect": patch
---

Fix `Yaml.parse` block scalar chomping to preserve trailing line breaks with keep (`|+`, `>+`) and avoid adding line breaks to empty or unterminated scalars.

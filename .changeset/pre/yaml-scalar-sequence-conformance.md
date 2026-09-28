---
"effect": patch
---

Fix YAML indentless sequences, multiline scalar folding, and comments. Reject unsupported compact nested sequences (`- - value`) and document streams.

Previously accepted values such as `description: Use when: deploy` and `description: Deploy:` now throw `SyntaxError`: YAML forbids colons followed by whitespace or end-of-value in plain scalars. Quote these values, for example `description: "Use when: deploy"`.

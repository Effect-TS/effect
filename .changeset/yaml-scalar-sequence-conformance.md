---
"effect": patch
---

Fix YAML parsing of indentless sequence values and multiline plain and quoted scalars. Preserve YAML folding, escaped line breaks, and comment boundaries. Explicitly reject unsupported compact nested block sequences and document streams rather than returning incorrect values.

Plain scalar values in block mappings now reject a colon followed by whitespace or the end of the value. Previously accepted inputs such as `description: Use when: deploy` and `description: Deploy:` now throw a `SyntaxError`, matching YAML 1.2. Quote the value to preserve its text, for example `description: "Use when: deploy"`.

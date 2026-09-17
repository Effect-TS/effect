---
"effect": patch
---

Fix YAML parsing of indentless sequence values and multiline plain and quoted scalars. Preserve YAML folding, escaped line breaks, and comment boundaries, and reject invalid unquoted colons in plain scalar values in block mappings.

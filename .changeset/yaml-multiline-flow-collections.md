---
"effect": patch
---

Support multiline flow collections in `Yaml.parse`, such as a JSON-style mapping whose entries and closing bracket are on separate lines. Continuation lines must be indented more than the parent node, but the closing bracket may sit at the parent's indentation, as in the `yaml` package. Plain and quoted scalars inside flow collections may span lines and are folded, and comments may follow any entry.

Support compact nested block sequences such as `- - value`, and parse a compact mapping in a sequence entry at the column where its first key starts.

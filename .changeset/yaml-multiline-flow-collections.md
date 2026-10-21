---
"effect": patch
---

Support multiline flow collections in `Yaml.parse`, such as a JSON-style mapping whose entries and closing bracket are on separate lines. Continuation lines must be indented more than the parent node, but the closing bracket may sit at the parent's indentation, as in the `yaml` package. Multiline plain scalars inside flow collections are folded. Multiline quoted scalars inside flow collections are still not supported and fail with a `SyntaxError`.

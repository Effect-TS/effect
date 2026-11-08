---
"effect": minor
---

Add `Yaml.stringify` and `Yaml.stringifyAll` for block-style YAML output, and extend parsing with YAML 1.2 core tags and more collection and multiline scalar syntax.

### Breaking changes

- `Yaml.parse` and `Yaml.parseAll` now use YAML 1.2 core scalar, tag and key resolution. Quote values and keys to preserve literal text.
- Unsupported tags, key properties and invalid or ambiguous collection syntax now fail instead of becoming text. Quote literals or use supported YAML syntax.
- Non-YAML whitespace is preserved, and parsing enforces nesting and merge-expansion limits. Remove unintended whitespace or byte order marks, and reduce excessive nesting or merge expansion.

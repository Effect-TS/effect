---
"effect": patch
---

Support multiline flow collections in `Yaml.parse`, such as a JSON-style mapping whose entries and closing bracket are on separate lines. Continuation lines must be indented more than the parent node, but the closing bracket may sit at the parent's indentation, as in the `yaml` package. Plain and quoted scalars inside flow collections may span lines and are folded, and comments may follow any entry.

Support compact nested block sequences such as `- - value`, and parse a compact mapping in a sequence entry at the column where its first key starts.

Support explicit `? key` entries in block and flow mappings, keys without values in flow mappings, and single-pair `key: value` entries in flow sequences. Keys must be scalars; a collection key fails with a `SyntaxError`. A plain scalar in a flow collection now ends only at a `:` followed by a space or flow indicator, so `{http://x: 1}` has the key `http://x`, and `{a:1}` is the key `a:1` with a null value, as YAML 1.2 specifies.

---
"effect": patch
---

Fix `Yaml.parse` rejecting multiline flow collections, and add compact nested sequences, explicit `? key` entries, flow pairs, core schema tags with `%TAG` handles, content on the `---` line, and tab separation.

Some input that was accepted before now fails with a `SyntaxError` or parses differently:

- `{a:1}` is the key `a:1` with a null value, as YAML 1.2 specifies; write `{a: 1}`
- tags are resolved instead of kept in the text, so `!Ref 123` is `"123"` rather than `"!Ref 123"`, and a core tag that does not fit its node, such as `!!int abc`, fails
- `key: - a`, block scalar headers such as `|0` or `> text`, and plain scalars starting with an indicator such as `@` fail
- directives without a following `---`, malformed or repeated `%YAML` and `%TAG` directives, and `%` lines inside a document fail
- recursive aliases fail with an error that names the alias

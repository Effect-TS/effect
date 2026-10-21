---
"effect": patch
---

Support multiline flow collections in `Yaml.parse`. Continuation lines must be indented past the parent node, and the closing bracket may sit at the parent's indentation. Plain and quoted scalars inside flow collections may span lines, and comments may follow any entry.

`Yaml.parse` also supports:

- compact nested block sequences such as `- - value`
- explicit `? key` entries, flow mapping keys without values (`{a, b: 1}`) and flow sequence pairs (`[a: 1]`)
- the core schema tags (`!!str`, `!!int`, `!!float`, `!!bool`, `!!null`, `!!map`, `!!seq`), verbatim tags and `%TAG` handles
- anchors and tags in either order, and aliases as keys
- document content on the `---` line, such as `--- text` or `--- |`
- tabs as separation after indentation and indicators

Some input that was previously accepted now fails with a `SyntaxError` or parses differently:

- `{a:1}` is the key `a:1` with a null value, as YAML 1.2 specifies
- tags are no longer kept in the scalar text, and tags other than the core ones are ignored, so `!Ref 123` is `"123"` rather than `"!Ref 123"`
- a core tag that does not fit its node, such as `!!int abc`
- collection keys, such as `? [a]`
- `key: - a`, malformed block scalar headers such as `|0` or `> text`, and plain scalars starting with an indicator such as `@`
- directives without a following `---`, malformed `%YAML` and `%TAG` directives, and `%` lines inside a document

Recursive aliases still fail, now with an error that says so.

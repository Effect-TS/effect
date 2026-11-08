---
"effect": minor
---

Add `Yaml.stringify` and `Yaml.stringifyAll`, plus YAML 1.2 core tags, compact sequences, multiline flow scalars, flow pairs, valueless flow keys, and escaped literal tabs to parsing.

### Breaking changes

`Yaml.parse` and `Yaml.parseAll` now interpret or reject these inputs differently:

- **Core schema:** `tRuE`, `nULL`, `.iNf`, `0X1F`, `0O17`, `-0x10`, `+0x1`, `1_000` and `_1` are strings. `012`, `0644`, `5.` and `.5e3` are numbers (`12`, `644`, `5`, `500`). Quote scalars to preserve strings.
- **Tags:** `!!str`, `!!int`, `!!float`, `!!bool`, `!!null`, `!!seq` and `!!map` resolve instead of remaining text; mismatched content and other tags (including local, non-specific and verbatim tags) fail. Quote tagged scalars to preserve their text.
- **Unsupported syntax now fails:** `key: - value`, explicit keys (`- ? a`, `{? a : 1}`), lone `?` values, empty anchors, multiple anchors on one node, flow entries starting with `-` followed by whitespace or a flow delimiter (`[- 1]`, `[1, -]`), and leading flow-mapping commas (`{, a: 1}`). Use supported collection syntax or quote literal text.
- **Byte order marks:** a BOM on a blank or comment-only line after content fails. A BOM at the start of a later content line is preserved: `\uFEFFb: 2` has the key `"\uFEFFb"`, not `"b"`. Remove unintended BOMs.
- **Flow separators:** `[a: 1]` gives `[{a: 1}]`, not `["a: 1"]`; `{a, b: 1}` gives `{a: null, b: 1}`, not a key `"a, b"`; `{http://x: 1}` preserves the key `"http://x"`, not `"http"`. Extra separators (`{a: b: c}`) and colon-containing keys without values (`{a:1}`) fail. Write `{a: 1}` or quote literal text.
- **Flow brackets:** unquoted `[` or `{` within flow plain scalars fail (`[a[, b]`, `{b: a{}`), as do collection keys (`{[1]: x}`). Quote these scalars or keys.
- **Flow comments:** a comment ends a plain scalar, so `[b # note` followed by `c]` fails instead of giving `["b c"]`. Quotes on plain continuation lines are literal: `[b` / `'c # note` / `]` gives `["b 'c"]`. Quote the whole scalar to include a hash or fold across lines after it.
- **Key properties:** anchors, tags and aliases on keys fail: `&m <<: *base`, `!!str 1: x` and `*name : value` no longer produce literal keys. Quote the key to preserve its text.
- **Quoted block keys:** trailing text before `:` fails (`"a" "b": 1`, `"a"b: 1`). Quote the whole key.
- **Flow key conversion:** `{0x10: 1}` has key `"16"` and `{null: 1}` has key `""`, matching block keys. Quote keys to preserve their spelling.
- **Tabs after sequence dashes:** `-\tvalue` is an entry, not a string; `-\t- value` and `-\tkey: value` fail. Use spaces to indent nested collections or quote literal text.
- **Whitespace:** no-break spaces, U+2028 and other non-YAML whitespace remain in scalars and keys instead of being trimmed. Remove them if unintended.
- **Resource limits:** nesting beyond 1000 collection levels and merges copying more than 100,000 keys per document fail. Reduce nesting or merge expansion.

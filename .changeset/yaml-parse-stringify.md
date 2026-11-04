---
"effect": minor
---

Add `Yaml.stringify` and `Yaml.stringifyAll`, and extend `Yaml.parse` and `Yaml.parseAll` with YAML 1.2 core schema tags, compact nested sequences (`- - value`), multiline quoted scalars in flow collections, single pairs in flow sequences (`[a: 1]`), flow mapping keys without values (`{a, b: 1}`), anchored and aliased keys, and escaped literal tabs.

### Breaking changes

Some input that `Yaml.parse` and `Yaml.parseAll` used to accept now gives a different value or fails:

- Plain scalars resolve with the YAML 1.2 core schema, so only its spellings are typed. `tRuE`, `nULL`, `.iNf`, `0X1F`, `0O17`, `1_000` and `_1` are now strings, and `012`, `5.` and `.5e3` are now the numbers `12`, `5` and `500`. Quote a scalar to keep it as a string.
- The core tags `!!str`, `!!int`, `!!float`, `!!bool`, `!!null`, `!!seq` and `!!map` are resolved instead of kept as text, so `a: !!int 42` gives `42` rather than `"!!int 42"`, and content that does not match its tag fails. All other tags fail, such as `!custom x`, `!!binary` and verbatim tags. Quote a tagged scalar to keep its text.
- `key: - value`, explicit keys (`- ? a`, `{? a : 1}`), a lone `?` value (`a: ?`), an empty anchor (`a: &`), flow entries starting with `-` and white space (`[- 1]`, `[1, -]`), and a byte order mark on a line after the content fail. Quote the scalar to keep it as a string.
- In flow collections, `:` separates a key from its value. `[a: 1]` gives `[{a: 1}]` instead of `["a: 1"]`, `{a, b: 1}` gives `{a: null, b: 1}` instead of the key `"a, b"`, and `{http://x: 1}` gives the key `"http://x"` instead of `"http"`. A second separator, as in `{a: b: c}`, fails instead of giving the value `"b: c"`, and so does a key without a value that contains `:`, such as `{a:1}`. Write `{a: 1}` with a space, or quote the scalar.
- An anchored merge key (`&m <<: *base`) merges like `<<: *base` instead of giving the literal key `"&m <<"`.
- An alias used as a key (`*name : value`) uses the anchored scalar as the key instead of the text `*name`, and an alias to a collection used as a key fails.
- Plain keys in flow mappings are converted like block keys, so `{0x10: 1}` gives the key `"16"` and `{null: 1}` gives `""`. Quote flow keys to keep their spelling.
- A tab after a block sequence `-` is separation, so `-\tvalue` is a sequence entry instead of the string `"-\tvalue"`, and `-\t- value` and `-\tkey: value` fail.
- No-break spaces, U+2028 and other characters that are not YAML white space are kept in scalars and keys instead of being trimmed.
- Collections nested more than 1000 levels deep fail, and so do merges that copy more than 100,000 keys in one document.

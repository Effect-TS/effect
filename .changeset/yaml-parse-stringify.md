---
"effect": minor
---

Add `Yaml.stringify` and `Yaml.stringifyAll`, and extend `Yaml.parse` and `Yaml.parseAll` with YAML 1.2 core schema tags, compact nested sequences (`- - value`), multiline quoted scalars in flow collections, single pairs in flow sequences (`[a: 1]`), flow mapping keys without values (`{a, b: 1}`), anchored and aliased keys, and escaped literal tabs.

### Breaking changes

Some input that `Yaml.parse` and `Yaml.parseAll` used to accept now gives a different value or fails:

- Plain scalars resolve with the YAML 1.2 core schema, so only its spellings are typed. `tRuE`, `nULL`, `.iNf`, `0X1F`, `0O17`, signed hexadecimal such as `-0x10` and `+0x1`, `1_000` and `_1` are now strings, and `012`, `0644`, `5.` and `.5e3` are now the numbers `12`, `644`, `5` and `500`. Quote a scalar to keep it as a string.
- The core tags `!!str`, `!!int`, `!!float`, `!!bool`, `!!null`, `!!seq` and `!!map` are resolved instead of kept as text, so `a: !!int 42` gives `42` rather than `"!!int 42"`, and content that does not match its tag fails. All other tags fail, such as `!custom x`, `!!binary` and verbatim tags. Quote a tagged scalar to keep its text.
- `key: - value`, explicit keys (`- ? a`, `{? a : 1}`), a lone `?` value (`a: ?`), an empty anchor (`a: &`), a second anchor for the same node on the next line (`a: &x` followed by `&y 1`), flow entries starting with `-` and white space (`[- 1]`, `[1, -]`), a leading comma in a flow mapping (`{, a: 1}`), and a blank or comment-only line that holds a byte order mark after the content fail. A byte order mark at the start of a later content line is kept as text, so `\uFEFFb: 2` gives the key `"\uFEFFb"` instead of `"b"`. Quote the scalar to keep it as a string.
- In flow collections, `:` separates a key from its value. `[a: 1]` gives `[{a: 1}]` instead of `["a: 1"]`, `{a, b: 1}` gives `{a: null, b: 1}` instead of the key `"a, b"`, and `{http://x: 1}` gives the key `"http://x"` instead of `"http"`. A second separator, as in `{a: b: c}`, fails instead of giving the value `"b: c"`, and so does a key without a value that contains `:`, such as `{a:1}`. Write `{a: 1}` with a space, or quote the scalar.
- An unquoted `[` or `{` inside a plain scalar in a flow collection fails, so `[a[, b]` no longer gives `["a[", "b"]` and `{b: a{}` no longer gives `{b: "a{"}`. A flow collection used as a flow mapping key fails too, so `{[1]: x}` no longer gives the key `"[1]"`. Quote the scalar to keep the bracket.
- In a flow collection, a comment ends a plain scalar, so `[b # note` followed by `c]` fails instead of giving `["b c"]`, and a quote that starts a continuation line is text, so `[b` followed by `'c # note` and `]` gives `["b 'c"]` instead of keeping the comment.
- An anchored merge key (`&m <<: *base`) merges like `<<: *base` instead of giving the literal key `"&m <<"`.
- An alias used as a key (`*name : value`) uses the anchored scalar as the key instead of the text `*name`, and an alias to a collection used as a key fails.
- A quoted block key followed by more text before its `:` fails, so `"a" "b": 1` and `"a"b: 1` no longer give keys that keep the quote characters. Quote the whole key.
- Plain keys in flow mappings are converted like block keys, so `{0x10: 1}` gives the key `"16"` and `{null: 1}` gives `""`. Quote flow keys to keep their spelling.
- A tab after a block sequence `-` is separation, so `-\tvalue` is a sequence entry instead of the string `"-\tvalue"`, and `-\t- value` and `-\tkey: value` fail.
- No-break spaces, U+2028 and other characters that are not YAML white space are kept in scalars and keys instead of being trimmed.
- Collections nested more than 1000 levels deep fail, and so do merges that copy more than 100,000 keys in one document.

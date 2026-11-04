---
"effect": minor
---

Add `Yaml.stringify` and `Yaml.stringifyAll`, and extend `Yaml.parse` and `Yaml.parseAll` with YAML 1.2 core schema tags, compact nested sequences (`- - value`), multiline quoted scalars in flow collections, anchored and aliased keys, and escaped literal tabs.

### Breaking changes

Some input that `Yaml.parse` and `Yaml.parseAll` used to accept now gives a different value or fails:

- The core tags `!!str`, `!!int`, `!!float`, `!!bool`, `!!null`, `!!seq` and `!!map` are resolved instead of kept as text, so `a: !!int 42` gives `42` rather than `"!!int 42"`, and content that does not match its tag fails. All other tags fail, such as `!custom x`, `!!binary` and verbatim tags. Quote a tagged scalar to keep its text.
- `key: - value`, flow explicit keys (`{? a : 1}`) and flow entries starting with `-` and white space (`[- 1]`, `[1, -]`) fail. Quote the scalar to keep it as a string.
- An alias used as a key (`*name : value`) uses the anchored scalar as the key instead of the text `*name`, and an alias to a collection used as a key fails.
- Plain keys in flow mappings are converted like block keys, so `{0x10: 1}` gives the key `"16"` and `{null: 1}` gives `""`. Quote flow keys to keep their spelling.
- A tab after a block sequence `-` is separation, so `-\tvalue` is a sequence entry instead of the string `"-\tvalue"`, and `-\t- value` and `-\tkey: value` fail.
- No-break spaces, U+2028 and other characters that are not YAML white space are kept in scalars and keys instead of being trimmed.
- Collections nested more than 1000 levels deep fail.

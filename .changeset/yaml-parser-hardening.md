---
"effect": minor
---

`Yaml.parse` and `Yaml.parseAll` now reject input they used to misread. Tags such as `!!str 123` and `!custom x` used to be kept as part of the string, and now fail. Explicit keys (`? key`) now fail with a clear error, where the flow form `{? a : 1}` used to produce the key `"? a"`. Collections nested more than 1000 levels deep fail with an `EncodingError` instead of exhausting the stack.

An alias may now be a mapping key when it refers to a scalar, so `*name : value` uses the anchored value as the key instead of the literal text `*name`. An alias to a collection used as a key fails.

Only spaces and tabs are treated as YAML white space. A no-break space (U+00A0), U+2028 and similar characters are now kept in scalars and keys instead of being trimmed, and a `#` after them is content rather than the start of a comment.

Numbers still use JavaScript number semantics, so integers beyond `Number.MAX_SAFE_INTEGER` lose precision; quote them to keep the exact digits.

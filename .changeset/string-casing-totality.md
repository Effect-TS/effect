---
"effect": patch
---

Make `String.snakeToCamel` and `String.snakeToPascal` total over leading, trailing, and repeated underscores, and skip the phantom empty word in `String.noCase` for inputs without words.

`snakeToCamel("foo_")` and `snakeToPascal("foo_")` previously threw a `TypeError`. Surrounding underscores are now removed and repeated underscores collapse into one word boundary, so `snakeToCamel("_foo")` returns `"foo"` instead of `"_foo"` and `snakeToCamel("foo__bar")` returns `"fooBar"` instead of `"foo_bar"`. `noCase("---", { transform })` now returns `""` without calling `transform`.

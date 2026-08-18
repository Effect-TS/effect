---
"effect": patch
---

Fix `Match.value` terminal combinators failing to typecheck when the input
contains a generic type parameter.

The fifth type argument of `Matcher` for value matchers is now `"value"`;
update hand-written value-matcher annotations accordingly.

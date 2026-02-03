---
"effect": patch
---

fix(Match): handle null/undefined in `Match.tag` and `Match.tagStartsWith`

Added null checks to `discriminator` and `discriminatorStartsWith` predicates to prevent crashes when matching nullable union types.

Fixes #6017

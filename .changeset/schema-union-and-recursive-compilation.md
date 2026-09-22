---
"effect": patch
---

Stop repeating per-value work in Schema's union candidate index, `toEquivalence` and `toFormatter`

- `SchemaAST.getCandidates` resolved a union's candidates on every decode. For a union with no
  literal members they depend only on the input's runtime type, so they are now resolved once per
  runtime type and shared. The cached index lookup no longer allocates the index builder's closure
  context.
- `toEquivalence` and `toFormatter` recompiled a `Schema.suspend` target at every level of the
  compared or formatted value; the compiled body is now reused across levels. `toEquivalence` also
  captured an unused path array per level, which is removed.

Decoded values, issue trees, error messages, equivalence results and formatter output are
unchanged. `toFormatter`'s `onBefore` hook is now invoked once per suspended target instead of once
per level of the formatted value.

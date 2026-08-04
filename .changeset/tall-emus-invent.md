---
"effect": patch
---

Reduce the bundle size of the `Equal` module.

`Equal.equals` no longer computes `Hash.hash` as a fast-path rejection before
comparing objects, making the `Hash` module import type-only. Structural
comparison already short-circuits on the first mismatch, and inside
hash-bucketed collections the hashes are always equal by the time `Equal.equals`
runs, so the pre-check mostly added overhead. `Equal.isEqual` also checks the
symbol directly instead of going through `Predicate.hasProperty`, removing the
`Predicate` and `Function` modules from the dependency graph.

A bundle containing only `Equal.equals` shrinks from 4752 to 2651 bytes
minified (1886 to 1058 bytes gzipped).

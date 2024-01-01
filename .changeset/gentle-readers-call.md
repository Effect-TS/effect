---
"@effect/schema": minor
---

Refactor `ParseResult` module:

- add `Union` issue, and replace `UnionMember` with `Union`
- add `Tuple` issue, and replace `Index` with `Tuple`
- add `TypeLiteral` issue
- add `Transform` issue
- add `Refinement` issue
- add `ast` field to `Member`
- rename `UnionMember` to `Member`
- `Unexpected`: rename `ast` to `expected` and make the field required
- `Type`: rename `expected` to `ast`

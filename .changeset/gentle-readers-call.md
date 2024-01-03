---
"@effect/schema": minor
---

Schema: refactor `ParseResult` module:

- add `Union` issue, and replace `UnionMember` with `Union`
- add `Tuple` issue, and replace `Index` with `Tuple`
- add `TypeLiteral` issue
- add `Transform` issue
- add `Refinement` issue
- add `ast` field to `Member`
- rename `UnionMember` to `Member`
- `Type`: rename `expected` to `ast`
- `ParseError` replace `errors` field with `error` field and refactor `parseError` constructor accordingly
- `Index` replace `errors` field with `error` field
- `Key` replace `errors` field with `error` field
- `Member` replace `errors` field with `error` field
- `ParseError` replace `errors` field with `error` field

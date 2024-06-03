---
"@effect/schema": minor
---

ParseResult

- `Missing`
  - add `ast: AST.Element | AST.PropertySignature` field
  - add `message` field
- remove `missing` export
- `Unexpected`
  - replace `ast` field with a `message` field

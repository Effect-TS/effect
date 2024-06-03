---
"@effect/schema": patch
---

TODO: ^---- change `patch` to `minor`

AST

- add `annotations` field to `Element`
- add `MissingMessageAnnotation`

Schema

- add `missingMessage` annotation to `PropertySignature`

ParseResult

- `Missing`
  - add `ast: AST.Element | AST.PropertySignature` field
  - add `message` field
- remove `missing` export
- `Unexpected`
  - replace `ast` field with a `message` field

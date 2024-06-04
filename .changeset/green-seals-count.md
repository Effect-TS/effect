---
"@effect/schema": patch
---

TODO: ^---- change `patch` to `minor`

AST

- add `annotations` field to `Element`
- add `MissingMessageAnnotation`
- add `AnnotatedAST`
- change `TupleType` definition: from `rest: ReadonlyArray<AST>` to `rest: ReadonlyArray<AnnotatedAST>`

Schema

- add `missingMessage` annotation to `PropertySignature`

ParseResult

- `Missing`
  - add `ast: AST.AnnotatedAST` field
  - add `message` field
- remove `missing` export
- `Unexpected`
  - replace `ast` field with a `message` field

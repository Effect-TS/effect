---
"@effect/schema": patch
---

TODO: ^---- change `patch` to `minor`

AST

- add `annotations` field to `Element`
- add `MissingMessageAnnotation`
- add `Type`
- rename `Element` to `OptionalType`
- change `TupleType` definition: from `rest: ReadonlyArray<AST>` to `rest: ReadonlyArray<Type>`

Schema

- add `missingMessage` annotation to `PropertySignature`
- rename `PropertySignatureTypeId` to `TypeTypeId`

ParseResult

- `Missing`
  - add `ast: AST.Type` field
  - add `message` field
- remove `missing` export
- `Unexpected`
  - replace `ast` field with a `message` field

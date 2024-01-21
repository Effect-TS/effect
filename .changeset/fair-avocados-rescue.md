---
"@effect/schema": minor
---

Refactoring:

- Schema:
  - refactor `Schema.declare` API to make it safe
  - add `Schema.declare` overloads
  - add `unparse*` APIs
  - symplify brand implementation
  - rename `params` to `annotation` in `typeId` annotation
- AST:
  - return `ParseResult.ParseIssue` instead of `ParseResult.ParseError` in all APIs
  - Declaration
    - split `decode` into `parse` / `unparse` in
    - remove `type` field
- ParseResult
  - align `mapBoth` with `Effect` (i.e. onFailure, onSuccess handlers)
  - add missing `Declaration` node in `ParseIssue`

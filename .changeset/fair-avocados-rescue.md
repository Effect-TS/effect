---
"@effect/schema": minor
---

AST / Schema: refactoring

- Schema:
  - refactor `Schema.declare` API to make it safe
  - add `Schema.declare` overloads
  - add `unparse*` APIs
- AST:
- return `ParseResult.ParseIssue` instead of `ParseResult.ParseError` in all APIs
- Declaration
  - split `decode` into `parse` / `unparse` in
  - remove `type` field

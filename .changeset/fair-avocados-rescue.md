---
"@effect/schema": minor
---

AST / Schema: refactoring

- refactor `Schema.declare` API to make it safe
- add `Schema.declarePrimitive` API
- `AST.Declaration`
  - split `decode` into `parse` / `encode` in
  - remove `type` field
- return `ParseResult.ParseIssue` instead of `ParseResult.ParseError`

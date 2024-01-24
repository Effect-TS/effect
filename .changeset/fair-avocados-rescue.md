---
"@effect/schema": minor
---

Refactoring:

- Schema:
  - refactor `Schema.declare` API to make it safe
  - add `Schema.declare` overloads
  - add `encodeUnknown*` APIs
  - rename `parse*` APIs to `decodeUnknown*`
  - symplify brand implementation
  - rename `params` to `annotation` in `typeId` annotation
  - add optional `{ strict: false }` parameter to `compose`
  - `Class`
    - rename `transform` to `transformOrFail`
    - rename `transformFrom` to `transformOrFailFrom`
  - add `hashSet` and `hashSetFromSelf`
- AST:
  - return `ParseResult.ParseIssue` instead of `ParseResult.ParseError` in all APIs
  - Declaration
    - split `decode` into `decodeUnknown` / `encodeUnknown`
    - remove `type` field
- ParseResult
  - align `mapBoth` with `Effect` (i.e. onFailure, onSuccess handlers)
  - add missing `Declaration` node in `ParseIssue`

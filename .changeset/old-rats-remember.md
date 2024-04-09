---
"@effect/schema": minor
---

AST

- rename `isTransform` to `isTransformation`

Schema

- consolidate `transform` and `transformOrFail` parameters into an `options` object, #2434
- consolidate `Class.transformOrFail` and `Class.transformOrFailFrom` parameters into an `options` object
- consolidate `declare` parameters into an `options` object
- consolidate `optionalToRequired` parameters into an `options` object
- consolidate `optionalToOptional` parameters into an `options` object
- Removed `negateBigDecimal` function (This cleanup was prompted by the realization that numerous functions can be derived from transformations such as negation, Math.abs, increment, etc. However, including all of them in the library is not feasible. Therefore, `negateBigDecimal` was removed)

ParseResult

- rename `Tuple` to `TupleType`

TreeFormatter

- rename `formatIssue` to `formatIssueSync` (This change was made to maintain consistency in API naming across all decoding and encoding APIs.)
- rename `formatIssueEffect` to `formatIssue`
- rename `formatError` to `formatErrorSync`
- rename `formatErrorEffect` to `formatError`

ArrayFormatter

- rename `formatIssue` to `formatIssueSync`
- rename `formatIssueEffect` to `formatIssue`
- rename `formatError` to `formatErrorSync`
- rename `formatErrorEffect` to `formatError`

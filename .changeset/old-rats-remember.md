---
"@effect/schema": minor
---

AST

- rename `isTransform` to `isTransformation`

Schema

- consolidate `transform` and `transformOrFail` parameters into an `options` object, #2434
- consolidate `Class.transformOrFail` and `Class.transformOrFailFrom` parameters into an `options` object
- consolidate `declare` parameters into an `options` object

TreeFormatter

- rename `formatIssue` to `formatIssueSync`
- rename `formatIssueEffect` to `formatIssue`
- rename `formatError` to `formatErrorSync`
- rename `formatErrorEffect` to `formatError`

ArrayFormatter

- rename `formatIssue` to `formatIssueSync`
- rename `formatIssueEffect` to `formatIssue`
- rename `formatError` to `formatErrorSync`
- rename `formatErrorEffect` to `formatError`

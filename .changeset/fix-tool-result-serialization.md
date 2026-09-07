---
"effect": patch
---

Fix `Response.ToolResultPart` to select the success or failure schema using `isFailure`, preserving failure result encoding through `Response.AllParts` round trips.

### Breaking changes

- Persisted tool results whose `result` does not match the schema selected by `isFailure` are now rejected on decoding. For example, with `Schema.Number` for success and `Schema.NumberFromString` for failure, a failed result previously written as `404` must be stored as `"404"`.
- `Response.ToolResultPart` now returns `Schema.Codec<ToolResultPart, ToolResultPartEncoded>`. Update explicit type annotations that relied on the previous `Schema.decodeTo` return type.

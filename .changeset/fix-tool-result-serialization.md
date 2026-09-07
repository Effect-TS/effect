---
"effect": patch
---

Fix `Response.ToolResultPart` to select the success or failure schema using `isFailure`, preserving failure result encoding through `Response.AllParts` round trips.

### Breaking changes

- Persisted tool results whose `result` does not match the schema selected by `isFailure` are now rejected on decoding. Migrate their `result` to the encoding required by `isFailure`. For example, with `Schema.Number` for success and `Schema.NumberFromString` for failure, a failed result previously written as `404` must be stored as `"404"`. Encoding also rejects `encodedResult` values that do not match the selected branch.
- The factory now returns `Schema.Codec` over the existing `ToolResultPart` and `ToolResultPartEncoded` models instead of exposing a `Schema.decodeTo` return type. Update explicit type annotations to `Schema.Codec` and use the public schema encoding and decoding APIs instead of transformation-specific `.from` and `.to` fields.

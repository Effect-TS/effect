---
"effect": patch
---

Fix `Response.ToolResultPart` to select the success or failure schema using `isFailure`, preserving failure result encoding through `Response.AllParts` round trips.

Add `Tool.failureResultSchema(tool)`, the schema for a failed tool call result: `AiError`, the tool's `failureSchema`, and the new `Tool.ExecutionFailure` schema for denied or interrupted calls, in that order. `Toolkit` result encoding and the `Response` part schemas now share it, so `AiError` and execution failure results round trip through `Response.AllParts` while user failures keep their own codec and fields.

### Breaking changes

- Persisted tool results whose `result` does not match the schema selected by `isFailure` are now rejected on decoding. For example, with `Schema.Number` for success and `Schema.NumberFromString` for failure, a failed result previously written as `404` must be stored as `"404"`.
- `Response.ToolResultPart` now returns `Schema.Codec<ToolResultPart, ToolResultPartEncoded>`. Update explicit type annotations that relied on the previous `Schema.decodeTo` return type.
- `Tool.FailureResult`, `Tool.FailureResultEncoded`, `Tool.Result`, and `Tool.ResultEncoded` now include `Tool.ExecutionFailure` regardless of `failureMode`. Code that narrows a failed tool result to the tool's own failure type must also handle an execution failure.

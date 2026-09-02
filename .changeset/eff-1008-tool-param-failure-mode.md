---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Route tool call parameter validation failures through the tool's `failureMode` and drop `ToolParameterValidationError.toolParams`.

With `failureMode: "return"`, invalid tool call parameters now produce a failed tool result (`isFailure: true`) instead of failing the effect or killing the `streamText` stream, matching how tool handler failures are treated. The default `failureMode: "error"` still fails with `ToolParameterValidationError`.

`ToolParameterValidationError` no longer carries a `toolParams` field, which previously made error construction throw for non-JSON parameter values such as `NaN` or `Infinity`.

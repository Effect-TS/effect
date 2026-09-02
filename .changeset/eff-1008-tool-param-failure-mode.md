---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
"@effect/ai-openrouter": patch
---

Route tool call parameter validation failures through the tool's `failureMode` and drop `ToolParameterValidationError.toolParams`.

With `failureMode: "return"`, invalid tool call parameters now produce a failed tool result (`isFailure: true`) instead of failing the effect or killing the `streamText` stream, matching how tool handler failures are treated. The default `failureMode: "error"` still fails with `ToolParameterValidationError`. This applies to the provider packages as well: the OpenAI, OpenAI-compat, and Anthropic packages no longer fail the response when tool call parameters do not match the tool's schema. Instead they convert valid parameters into the tool's standard encoded form and pass invalid parameters through unchanged, leaving `Toolkit` as the single authority for parameter validation.

`ToolParameterValidationError` no longer carries a `toolParams` field, which previously made error construction throw for non-JSON parameter values such as `NaN` or `Infinity`.

**Breaking runtime/type change**: when tool call resolution is enabled, tool call parts emitted by `generateText` / `streamText` now carry the raw (encoded) parameters instead of decoded ones, and their `params` field is typed as `unknown` (see the new `Response.ToolParametersMode`). Code that read decoded `params` off returned tool calls must decode them itself or read handler inputs instead. Provider-executed tool calls are still validated against the tool's parameter schema and fail with `InvalidOutputError` on mismatch, as before.

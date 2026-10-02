---
"@effect/ai-anthropic": patch
---

Fail streamed tool calls whose accumulated `input_json_delta` fragments are not valid JSON with an `AiError` carrying a `ToolParameterValidationError` reason, instead of dying with a `SyntaxError` defect. Malformed streamed input can now be caught like any other `AiError` (e.g. answered with an error `tool_result` so the model can retry).

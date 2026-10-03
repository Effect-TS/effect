---
"@effect/ai-anthropic": patch
---

Return an `AiError` with `ToolParameterValidationError` instead of a defect when streamed Anthropic tool arguments contain malformed JSON, including provider-executed tool calls.

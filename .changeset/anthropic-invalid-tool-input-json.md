---
"@effect/ai-anthropic": patch
---

Fail streamed responses with an `AiError` (`ToolParameterValidationError`) when the accumulated tool call input is not valid JSON, instead of dying with a `SyntaxError`.

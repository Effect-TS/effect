---
"@effect/ai-openrouter": patch
---

Fix `OpenRouterLanguageModel` streams silently dropping truncated tool calls on token limits by failing with `ToolParameterValidationError`.

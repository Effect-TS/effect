---
"@effect/ai-openrouter": patch
---

Fix `OpenRouterLanguageModel` interrupting tool execution when OpenRouter returns tool calls without a finish reason; such responses now finish with `"tool-calls"`.

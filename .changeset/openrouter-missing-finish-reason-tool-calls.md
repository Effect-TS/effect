---
"@effect/ai-openrouter": patch
---

Fix `OpenRouterLanguageModel` interrupting tool calls when a response that contains them arrives without a finish reason; it now finishes with `"tool-calls"`.

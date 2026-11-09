---
"@effect/ai-openrouter": patch
---

Fix `OpenRouterLanguageModel` rejecting tool calls whose parameter schemas the model's codec rewrites, such as records, and send strict tools a strict-compatible schema for every model.

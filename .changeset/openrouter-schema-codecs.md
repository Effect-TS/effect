---
"@effect/ai-openrouter": patch
---

Fix `OpenRouterLanguageModel` rejecting valid tool calls with record or tuple parameters, and send `Tool.Strict` tools a strict-compatible JSON Schema on every model.

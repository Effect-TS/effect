---
"@effect/ai-openrouter": patch
---

`OpenRouterLanguageModel.model` now reports `"openrouter"` as its provider name instead of `"openai"`, matching `OpenRouterDecisionModel.model` and the provider name used in OpenRouter telemetry spans.

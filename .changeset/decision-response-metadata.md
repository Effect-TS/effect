---
"effect": patch
"@effect/ai-openrouter": patch
---

`DecisionModel.decide` now returns the provider's response `id`, the `modelId` that answered, and provider-specific `metadata`. `OpenRouterDecisionModel` fills them from the Decisions API response, with the reported `cost` and serving provider under `metadata.openrouter`, so callers can price and attribute each decision.

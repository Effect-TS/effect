---
"effect": patch
"@effect/ai-openrouter": patch
---

`DecisionModel.decide` now returns the response `id`, the `modelId` that answered and provider `metadata`. `OpenRouterDecisionModel` reports `cost` and the serving provider under `metadata.openrouter`.

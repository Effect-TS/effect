---
"@effect/ai-openrouter": patch
---

Fix `OpenRouterLanguageModel` streams splitting reasoning into several parts and emitting empty text deltas when chunks contain empty `content`.

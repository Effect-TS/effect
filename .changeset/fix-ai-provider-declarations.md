---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openrouter": patch
---

Fix AI provider declarations so strict consumers can use `skipLibCheck: false` without enabling `exactOptionalPropertyTypes`.

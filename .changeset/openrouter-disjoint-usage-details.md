---
"@effect/ai-openrouter": patch
---

Fix `OpenRouterLanguageModel` reporting negative usage components when an upstream provider counts `reasoning_tokens` separately from `completion_tokens` (or `cached_tokens` separately from `prompt_tokens`). When a detail count exceeds its parent total the two are now treated as disjoint, so `outputTokens.total` is `completion_tokens + reasoning_tokens` and `outputTokens.text` is `completion_tokens` (likewise `inputTokens.total` and `inputTokens.uncached`), instead of a negative `text` or `uncached` value.

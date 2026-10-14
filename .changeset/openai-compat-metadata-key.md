---
"@effect/ai-openai-compat": patch
---

Use `"openai-compat"` instead of `"openai"` as the provider key for error metadata, prompt part options, and response part metadata, so `@effect/ai-openai-compat` no longer shares module augmentation keys with `@effect/ai-openai`.

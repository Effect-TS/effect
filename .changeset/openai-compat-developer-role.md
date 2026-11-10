---
"@effect/ai-openai-compat": patch
---

Fix `OpenAiLanguageModel` sending `developer` instead of `system` messages for models such as `olmo-2` and provider-prefixed IDs such as `openai/gpt-oss-120b`.

---
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
---

Fix `OpenAiLanguageModel` advertising non-strict tools with strict-mode schemas, which turned records into entry arrays and optional properties into required nullable ones.

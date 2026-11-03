---
"@effect/ai-openai": patch
---

Skip OpenAI `commentary` messages in structured output so `LanguageModel.generateObject` no longer fails when one precedes the final answer.

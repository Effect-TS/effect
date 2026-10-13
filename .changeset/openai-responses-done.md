---
"@effect/ai-openai": patch
---

Stop Responses streams at the `data: [DONE]` sentinel sent by some OpenAI-compatible servers instead of failing to decode it.

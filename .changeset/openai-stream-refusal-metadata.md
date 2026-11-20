---
"@effect/ai-openai": patch
---

Fix `streamText` dropping OpenAI refusal explanations, which are now included in `text-end` metadata and prompts built from the stream.

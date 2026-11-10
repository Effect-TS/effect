---
"@effect/ai-openai": patch
"@effect/ai-openai-compat": patch
---

Advertise a non-strict tool's parameters with their standard JSON Schema. `OpenAiLanguageModel` in both packages passed every tool through `toCodecOpenAI`, whatever `strictJsonSchema` said, so a non-strict tool still advertised records as `[key, value]` pairs and optional properties as required and nullable.

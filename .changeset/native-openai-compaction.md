---
"effect": minor
"@effect/ai-openai": minor
---

Add stateless native OpenAI compaction with opaque context parts, lossless replacement-window replay, and usage-preserving failures. Handle the new `compaction` part and `UnsupportedOperationError` reason in exhaustive matches, and provide `compact` or `compactResponse` when implementing custom `LanguageModel` or `OpenAiClient` services.

---
"effect": patch
"@effect/ai-openai": patch
"@effect/ai-openrouter": patch
---

Add `TranscriptionModel` to `effect/ai` for speech-to-text on recordings and live audio, with `OpenAiTranscriptionModel` and `OpenRouterTranscriptionModel`.

Hand-built `OpenAiClient` and `OpenRouterClient` services must add `createTranscription`.

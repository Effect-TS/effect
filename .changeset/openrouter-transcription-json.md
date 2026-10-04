---
"@effect/ai-openrouter": patch
---

Fix audio transcription requests to send JSON with base64 `input_audio` and structured `provider.options`. Scope the encoding choice to the OpenRouter spec configuration; the OpenAPI generator default and other providers are unchanged.

Migrate `createAudioTranscriptions` callers from multipart `file` payloads (including `FormData` casts) to `{ model, input_audio: { data: "<base64 audio>", format: "wav" } }`. The unused `CreateAudioTranscriptionsRequestFormData` export is removed; use `CreateAudioTranscriptionsRequestJson` instead.

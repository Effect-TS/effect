---
"@effect/ai-openrouter": patch
---

Send OpenRouter audio transcription requests as JSON, preserving structured `provider.options`. Other providers are unchanged.

Replace multipart `file` payloads with `{ model, input_audio: { data: "<base64 audio>", format: "wav" } }`. Use `CreateAudioTranscriptionsRequestJson` instead of the removed `CreateAudioTranscriptionsRequestFormData` export.

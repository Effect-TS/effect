---
"@effect/openapi-generator": patch
"@effect/ai-openrouter": patch
---

Generated HTTP clients now send `application/json` when an operation's request body also offers `multipart/form-data` or `application/x-www-form-urlencoded`. Previously the last form encoding won, which dropped nested JSON fields. The form schemas are still exported. `httpapi` output is unchanged.

OpenRouter `createAudioTranscriptions` now takes the JSON `STTRequest` payload (`input_audio`, `provider.options`, and so on) and sends it as JSON. The old multipart request was serialized as `[object Object]` and OpenRouter rejected it.

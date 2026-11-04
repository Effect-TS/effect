---
"@effect/ai-openai-compat": patch
---

Accept `null` for `service_tier` and `message.tool_calls` in chat completion responses and stream chunks, treating them like absent fields. Servers that serialize unset fields as `null` (for example vLLM) previously failed `generateText` with a decode error and had their null-tier stream chunks dropped.

Raw `OpenAiClient` response and chunk types now include `null` for these fields; check for nullish values rather than only `undefined`.

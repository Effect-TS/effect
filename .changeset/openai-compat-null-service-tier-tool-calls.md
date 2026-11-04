---
"@effect/ai-openai-compat": patch
---

Accept `service_tier: null` and `message.tool_calls: null` in chat completion responses. Servers that serialize the OpenAI Python SDK types or vLLM's response models send these nulls, which failed `generateText` with an `InvalidResponseError` and made streamed chunks carrying `service_tier: null` lose their text.

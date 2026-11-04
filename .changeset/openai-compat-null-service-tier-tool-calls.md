---
"@effect/ai-openai-compat": patch
---

Accept `null` for `service_tier` and `message.tool_calls` in chat completion responses, and for `service_tier` in streamed chunks. These nulls failed `generateText` with an `InvalidResponseError` (vLLM returns `service_tier: null` on non-streaming responses), and a streamed chunk carrying `service_tier: null` was dropped along with its text.

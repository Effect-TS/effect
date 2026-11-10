---
"@effect/ai-openai-compat": patch
---

Accept `null` for optional fields in `OpenAiClient` chat completion and embeddings responses: `service_tier`, a message's `tool_calls`, a tool call's `id`, `type` and `function.arguments`, and an embeddings response's `object` and `usage`. Some OpenAI-compatible servers send these as `null`, which failed a non-streaming response and dropped the stream chunk.

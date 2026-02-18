---
"@effect/ai-openrouter": patch
---

Fix `ChatStreamingMessageToolCall` schema rejecting valid streaming tool call chunks.

The OpenAI streaming spec splits tool calls across multiple SSE chunks — `function.name` is only present on the first chunk, but the schema required it on every chunk, causing a `MalformedOutput` error whenever the model returned a tool call.

Made `function.name` optional to match `id` which was already optional.

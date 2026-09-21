---
"@effect/ai-openai-compat": patch
---

Preserve streamed text and tool call arguments from OpenAI-compatible providers that send `delta.role: null` on text deltas and `tool_calls[].id: null` on continuation fragments.

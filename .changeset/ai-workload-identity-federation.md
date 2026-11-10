---
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
---

Add `AnthropicWorkloadIdentity.make` and `OpenAiWorkloadIdentity.make` to authenticate with workload identity federation, and fail OpenAI WebSocket streams with an `AiError` instead of a defect when a client transform fails.

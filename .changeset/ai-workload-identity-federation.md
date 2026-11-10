---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
---

Add workload identity federation with `WorkloadIdentity` in `effect/ai`, `AnthropicWorkloadIdentity` and `OpenAiWorkloadIdentity`, and fail OpenAI WebSocket streams with an `AiError` instead of a defect when a client transform fails.

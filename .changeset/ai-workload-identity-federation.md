---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
---

Add `WorkloadIdentity` helpers for Anthropic and OpenAI authentication, and report OpenAI WebSocket client-transform failures as `AiError` instead of defects.

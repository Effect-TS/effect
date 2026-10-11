---
"@effect/ai-openai-compat": patch
---

Replay assistant text, reasoning, and tool calls in Chat Completions requests even when their parts carry item IDs and `store` or `conversation` is configured. Remove unused Responses API include bookkeeping. Retain `store` and `conversation` as deprecated, ignored configuration options for compatibility; neither is sent to the provider.

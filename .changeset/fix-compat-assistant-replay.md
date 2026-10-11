---
"@effect/ai-openai-compat": patch
---

Replay assistant text, reasoning, and tool calls in Chat Completions requests even when their parts carry item IDs. Remove unused Responses API include bookkeeping and the unsupported `store` and `conversation` configuration options. Neither option is sent to the provider.

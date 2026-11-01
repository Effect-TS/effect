---
"@effect/ai-anthropic": patch
---

Fix Anthropic tool search: accept regex `pattern` and optional `limit` inputs, add `AnthropicTool.DeferLoading` for deferred tools, and replay tool search and web search results correctly in follow-up requests.

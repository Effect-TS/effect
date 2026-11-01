---
"@effect/ai-anthropic": minor
---

Fix Anthropic tool search: accept regex `pattern` and optional `limit` inputs, add `AnthropicTool.DeferLoading` for deferred tools, and replay tool search and web search results correctly in follow-up requests.

- `AnthropicTool.ToolSearchRegexParameters` now has `pattern` instead of `query`. Rename `query` to `pattern` in code that constructs or reads regex tool search inputs.

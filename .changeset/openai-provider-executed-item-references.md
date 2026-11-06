---
"@effect/ai-openai": patch
---

Fix OpenAI rejecting follow-up requests with "Duplicate item found" when stored history that contains web search or other built-in tool calls is replayed with item references.

---
"@effect/ai-openrouter": patch
---

Accept OpenRouter chat tool calls that omit `id`, and stream deltas that omit `index`. A missing id becomes `<response id>_tool_<index>`, so the tool call still runs instead of failing while the response is decoded.

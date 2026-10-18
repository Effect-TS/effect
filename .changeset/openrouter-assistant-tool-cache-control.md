---
"@effect/ai-openrouter": patch
---

Send `cache_control` on assistant text and tool results. Both were always serialized as plain strings, so cache breakpoints on assistant or tool messages and their parts never reached OpenRouter. Marked content is now sent as text parts carrying the breakpoint; a message-level breakpoint goes on the last assistant text part or the last tool result. An assistant turn without text still cannot carry one, since `tool_calls` have no `cache_control`.

---
"@effect/ai-openrouter": patch
---

Send `cache_control` on assistant text and tool results. Assistant content and tool results were always sent as plain strings, so a cache breakpoint set on an assistant or tool message, or on one of their parts, never reached OpenRouter. When a breakpoint is set, the content is now sent as text parts carrying it: on the marked part, or for a message-level breakpoint, on the last text part (assistant) or the last tool result (tool). An assistant turn with no text has nowhere to put one, since `tool_calls` cannot carry `cache_control`.

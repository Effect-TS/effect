---
"@effect/ai-anthropic": patch
---

Fix `AnthropicLanguageModel` sending custom tool names instead of Anthropic wire names in `tool_choice`, `oneOf` filtering, and replayed tool calls, and `AnthropicTool.ComputerUse_20241022` calls failing with `ToolNotFoundError`.

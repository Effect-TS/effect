---
"@effect/ai-anthropic": patch
---

Fix `AnthropicLanguageModel` sending the custom name instead of the provider name for provider-defined tools in `tool_choice`, `oneOf` filtering and replayed tool calls. Also fix `AnthropicTool.ComputerUse_20241022` declaring the provider name `computer_use` instead of `computer`, which made its tool calls fail with `ToolNotFoundError`.

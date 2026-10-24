---
"effect": patch
"@effect/ai-anthropic": patch
"@effect/ai-openai": patch
---

Add a `toModelContent` option to `Tool.make` and `Tool.dynamic`, so a tool can give the model content such as text and images.

The function maps a successful result to `Prompt.TextPart` and `Prompt.FilePart` values. The parts are kept on the tool result as `content`, and they survive prompt serialization. `@effect/ai-anthropic` sends them as `tool_result` content blocks, and `@effect/ai-openai` sends them as `function_call_output` content items, so the model can see images instead of their base64 text. Tools without `toModelContent` work as before.

---
"effect": patch
---

Fix `AnthropicStructuredOutput.toCodecAnthropic`, `OpenAiStructuredOutput.toCodecOpenAI`, and MCP tool schemas returning or rejecting a root `$ref` when the schema is an identified alias of another identified schema.

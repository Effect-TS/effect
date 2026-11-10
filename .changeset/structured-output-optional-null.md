---
"effect": patch
---

Stop `OpenAiStructuredOutput.toCodecOpenAI` and `AnthropicStructuredOutput.toCodecAnthropic` from adding a second `null` branch to optional properties whose JSON form already accepts `null`, such as `Schema.optional(...)` and `Schema.optionalKey(Schema.NullOr(...))`.

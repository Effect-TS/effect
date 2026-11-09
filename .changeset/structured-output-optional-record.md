---
"effect": patch
---

Fix `OpenAiStructuredOutput.toCodecOpenAI` and `AnthropicStructuredOutput.toCodecAnthropic` rejecting optional records and tuples in the format they advertise.

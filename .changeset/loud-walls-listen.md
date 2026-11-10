---
"effect": patch
"@effect/ai-anthropic": patch
---

Add `allowEmpty` to `LanguageModel.generateObject` and `Chat.generateObject` for optional structured values, and preserve Anthropic tool-call finish reasons with native structured output.

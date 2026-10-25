---
"@effect/ai-openai": patch
"@effect/ai-anthropic": patch
---

Fix `LanguageModel.generateText` and `LanguageModel.streamText` reporting `finishReason: "unknown"` instead of `"length"` when OpenAI hits `max_output_tokens` or Anthropic exceeds the model context window.

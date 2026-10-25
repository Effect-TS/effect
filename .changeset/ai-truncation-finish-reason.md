---
"@effect/ai-openai": patch
"@effect/ai-anthropic": patch
---

Fix `LanguageModel` responses reporting `finishReason: "unknown"` instead of `"length"` when OpenAI stops with `max_output_tokens` or Anthropic stops with `model_context_window_exceeded`. A truncated OpenAI response that contains a tool call now reports `"length"` and no longer runs the tool handler.

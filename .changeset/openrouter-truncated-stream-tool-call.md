---
"@effect/ai-openrouter": patch
---

Fix `OpenRouterLanguageModel` streams silently dropping a tool call whose parameters were cut off, for example by `finish_reason: "length"`; the stream now fails with a `ToolParameterValidationError`, as non-streamed responses do.

---
"effect": patch
"@effect/ai-anthropic": patch
---

Fix non-native structured output fallback (`structuredOutputs: false`) for the Anthropic provider (#8075).

- `AnthropicLanguageModel.prepareTools` no longer short-circuits when `generateObject` sends no tools / `toolChoice: "none"`: the JSON response tool is now injected and `tool_choice` is forced to that tool with parallel tool use disabled.
- `LanguageModel.resolveStructuredOutput` now resolves the structured output from the forced tool call (or a JSON text segment) instead of concatenating it with incidental text.

---
"@effect/ai-openai-compat": patch
---

Ignore empty `content` deltas in streamed chat completions. Providers such as Ollama send `content: ""` with every reasoning chunk, which split a single reasoning block into one part per token and opened the text part before the reasoning finished.

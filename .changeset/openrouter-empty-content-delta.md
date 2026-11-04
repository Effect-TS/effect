---
"@effect/ai-openrouter": patch
---

Ignore empty `content` deltas in streamed chat completions. OpenRouter sends `content: ""` alongside reasoning deltas for models such as DeepSeek and GLM, which closed the reasoning part after its first chunk, opened the text part before any text arrived, and stored the rest of the reasoning after the answer.

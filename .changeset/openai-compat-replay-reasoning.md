---
"@effect/ai-openai-compat": patch
---

Send the text, tool calls and reasoning of an assistant prompt message as a single chat message, as required by providers such as DeepSeek, Kimi and GLM during tool loops. Reasoning is replayed under the field the provider returned it in (`reasoning_content` or `reasoning`), defaulting to `reasoning_content`.

---
"@effect/ai-openai-compat": patch
---

Send the text and tool calls of one assistant prompt message as a single chat message, and add a `replayReasoning` option that replays assistant reasoning on that message as `reasoning_content` (or `reasoning`) for providers such as DeepSeek, Kimi and GLM.

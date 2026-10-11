---
"@effect/ai-openai-compat": patch
---

Send the text and tool calls of one assistant prompt message as a single chat message, and add a boolean `replayReasoning` option that replays assistant reasoning on that message as `reasoning_content` for providers such as DeepSeek, Kimi and GLM. Replay is disabled by default, and the option is not sent in the request body. Response decoding continues to accept both `reasoning_content` and `reasoning`.

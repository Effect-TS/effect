---
"@effect/ai-openai-compat": patch
---

Send the text, tool calls and reasoning of one assistant prompt message as a single chat message. Assistant reasoning is always replayed as `reasoning_content` for providers such as DeepSeek, Kimi and GLM, without requiring configuration. Reasoning stays within its original prompt message, and reasoning-only assistant turns are omitted. Response decoding continues to accept both `reasoning_content` and `reasoning`.

---
"@effect/ai-openrouter": patch
---

Fix OpenRouter responses failing to decode when a tool call omits its `id` or a streaming tool call omits its `index`.

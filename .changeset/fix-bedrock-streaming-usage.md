---
"@effect/ai-amazon-bedrock": patch
---

Fix `@effect/ai-amazon-bedrock` streaming so the terminal `"finish"` part carries real token counts. The Bedrock Converse stream sends `metadata` (with the populated `usage` block) **after** `messageStop`, but the SDK was emitting `"finish"` synchronously on `messageStop`, capturing the still-empty `usage` defaults. Buffer the finish reason on `messageStop` and emit `"finish"` from the `metadata` case once `inputTokens` / `outputTokens` / `totalTokens` are filled in.

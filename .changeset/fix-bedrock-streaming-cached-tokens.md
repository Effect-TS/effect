---
"@effect/ai-amazon-bedrock": patch
---

Fix streaming responses losing all token usage data (including cached input tokens). The finish part was being emitted during the `messageStop` event before the `metadata` event had populated token counts, causing `inputTokens`, `outputTokens`, `totalTokens`, and `cachedInputTokens` to be uninitialized. The finish part is now deferred until both `messageStop` and `metadata` have been received, matching the Bedrock ConverseStream API event ordering.

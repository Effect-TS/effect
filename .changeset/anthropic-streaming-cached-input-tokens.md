---
"@effect/ai-anthropic": patch
---

fix(ai-anthropic): populate `cachedInputTokens` in streaming responses from `cache_read_input_tokens`

The streaming response builder never copied `cache_read_input_tokens` into the normalized `usage`, so `cachedInputTokens` was always `undefined`/`0` for `streamText`/`streamObject` even when prompt caching was active. The non-streaming path already maps it; this mirrors that mapping at `message_start`, where the Anthropic API reports the cache-read count.

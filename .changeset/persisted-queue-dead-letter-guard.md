---
"effect": patch
"@effect/platform-cloudflare": patch
---

Add `PersistedQueue.isDeadLetterCause` so custom `PersistedQueueStore` implementations can mark elements that fail to decode as failed instead of retrying them.

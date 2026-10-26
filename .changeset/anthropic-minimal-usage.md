---
"@effect/ai-anthropic": patch
---

Accept Anthropic-compatible responses that omit cache and service tier usage fields, and keep previously reported input and cache token counts when a streamed `message_delta` omits them.

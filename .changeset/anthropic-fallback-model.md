---
"@effect/ai-anthropic": patch
---

Decode replies a fallback model took over: the `fallback` content block (streamed and in message content) and `fallback_message` usage iterations, plus `model` on usage iterations. The fallback block is emitted as a `response-metadata` part naming the fallback model, with the block in `metadata.anthropic.fallback`.

---
"effect": patch
---

Prevent tool handlers from running on incomplete or invalid language model responses.

`generateText` now validates the complete response before tool handlers can perform side effects and skips handlers when the finish reason does not indicate a complete response. `streamText` starts a handler as soon as the stream advances past its tool call (one-chunk lookahead, so a truncating finish that follows a tool call directly prevents the handler from starting) and interrupts handlers that are still running when the stream fails or finishes with an incomplete reason. Tool calls left unresolved by an incomplete finish receive a synthesized `execution-interrupted` failure result, so the conversation history never contains a tool call without a matching result. Incremental streaming fallback now occurs only before the provider emits its first content part.

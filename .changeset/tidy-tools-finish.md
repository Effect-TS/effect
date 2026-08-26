---
"effect": patch
---

Prevent tool handlers from running on incomplete or invalid language model responses.

`generateText` now validates the complete response before tool handlers can perform side effects and skips handlers when the finish reason does not indicate a complete response. `streamText` starts a handler as soon as its tool call's parameters are complete and interrupts handlers that are still running when the stream fails or finishes with an incomplete reason. Incremental streaming fallback now occurs only before the provider emits its first content part.

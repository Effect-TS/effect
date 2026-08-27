---
"effect": patch
---

Make automatic tool resolution interruption-safe for incomplete language model responses.

`generateText` now validates the complete response before tool handlers can perform side effects. When the finish reason is incomplete, executable tool calls receive an `execution-interrupted` failure result without starting their handlers. `streamText` holds each tool call for one chunk, starts its handler once the provider advances, and interrupts unresolved handlers when the stream fails or finishes with an incomplete reason. Calls left unresolved by an incomplete finish receive the same failure result. Incremental streaming fallback now occurs only before the provider emits its first content part.

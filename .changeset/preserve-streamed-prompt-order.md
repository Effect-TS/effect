---
"effect": patch
---

Preserve text and reasoning start order in `Prompt.fromResponseParts`, including text interleaved with tool calls. Keep nonempty partial text in interrupted chat history while omitting unfinished reasoning blocks that may lack provider-required replay metadata.

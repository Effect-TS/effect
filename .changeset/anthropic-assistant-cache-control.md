---
"@effect/ai-anthropic": patch
---

Send `cache_control` on assistant content blocks. A cache breakpoint set on an assistant message or on one of its parts was computed and then discarded, so assistant turns could never be cache breakpoints. A breakpoint now goes on the last block the part or message sends, skipping `thinking` and `redacted_thinking` blocks, which cannot carry one.

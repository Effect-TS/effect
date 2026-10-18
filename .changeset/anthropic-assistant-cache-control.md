---
"@effect/ai-anthropic": patch
---

Fix assistant cache breakpoints by sending `cache_control` on the last eligible content block, preserving part-level precedence and skipping thinking blocks.

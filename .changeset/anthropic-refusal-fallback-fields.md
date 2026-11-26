---
"@effect/ai-anthropic": patch
---

Decode Anthropic refusal stop details that omit the fallback fields, so refusal streams finish with a `content-filter` reason instead of failing.

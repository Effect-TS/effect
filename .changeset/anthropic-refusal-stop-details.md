---
"@effect/ai-anthropic": patch
---

Fix Anthropic refusals failing to decode when `stop_details` omits the fallback fields, which the API leaves out on refusals.

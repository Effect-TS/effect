---
"@effect/ai-anthropic": patch
---

Fix Anthropic responses failing to decode when their `container` has no `skills`, which the API omits unless the request loads skills.

---
"@effect/ai-anthropic": patch
---

Preserve already-base64 image strings and remove the base64 data-URL prefix in Anthropic model requests instead of encoding the string contents again.

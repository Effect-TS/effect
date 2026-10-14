---
"@effect/ai-cloudflare": patch
---

Support images in `CloudflareDecisionModel`. Byte arrays, base64 strings, and `data:` URLs are sent to Clef. Remote URLs fail with `AiError.InvalidUserInputError`.

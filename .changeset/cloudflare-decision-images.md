---
"@effect/ai-cloudflare": patch
---

Send `DecisionModel.decide` images to Cloudflare Clef. Byte arrays and base64 strings are sent with their media type, `data:` URLs are sent as is, and remote URLs fail with `AiError.InvalidUserInputError`.

---
"@effect/ai-anthropic": patch
---

Regenerate the Anthropic schemas from the pinned anthropic-sdk-typescript 0.135.0 spec, so newer request settings such as adaptive thinking `display` can be configured. The status-specific error responses replace the removed `*4XX` generated exports.

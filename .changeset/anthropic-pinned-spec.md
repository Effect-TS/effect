---
"@effect/ai-anthropic": patch
---

Regenerate the Anthropic client from the spec bundled with the Anthropic SDK, since the previously used spec URL is no longer published. Response fields added by the newer spec are optional, and the generated client keeps its existing methods and `4XX` error responses.

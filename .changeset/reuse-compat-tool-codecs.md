---
"@effect/ai-openai-compat": patch
---

Reuse each request's prepared tool parameter codecs when decoding OpenAI-compatible tool calls to avoid repeated schema conversion.

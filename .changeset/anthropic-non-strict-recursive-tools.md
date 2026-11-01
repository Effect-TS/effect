---
"@effect/ai-anthropic": patch
---

Allow recursive parameter schemas for non-strict Anthropic tools. When a non-strict tool's parameters cannot be converted with the Anthropic structured output codec, the plain JSON Schema is sent and returned tool call parameters are normalized with the matching JSON codec before Toolkit validates them. Strict tools and structured output still reject recursive schemas.

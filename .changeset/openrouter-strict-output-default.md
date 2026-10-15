---
"@effect/ai-openrouter": patch
---

Correct the `strictJsonSchema` documentation: omitted configuration sends `strict: null`, leaving strictness unspecified. Recommend explicit `true` for compatible endpoints and schemas, and clarify provider-specific support and schema restrictions without changing runtime behavior.

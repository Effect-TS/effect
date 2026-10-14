---
"effect": patch
"@effect/ai-typesafe": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openrouter": patch
"@effect/ai-openai": patch
---

Allow JSON objects and arrays in decision instructions and descriptions, and `null` in classification descriptions.

`Decision.rate` accepts strings or `{ label, description }` levels. **Breaking:** `Rate["criteria"]` now contains objects; read `.label` instead of treating entries as strings.

TypeSafe, Cloudflare, and OpenRouter support structured descriptions and score legends. OpenAI remains string-only and rejects structured or `null` values with `InvalidUserInputError` before sending a request.

---
"effect": patch
"@effect/ai-typesafe": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openrouter": patch
"@effect/ai-openai": patch
---

Accept structured instructions and descriptions in `Decision`. They can be strings, JSON objects, or JSON arrays, and `Decision.classify` option descriptions can also be `null`.

`Decision.rate` accepts `{ label, description }` levels alongside plain strings. `Rate["criteria"]` now stores every level in that form, so code that read it as an array of strings must read `.label`.

The TypeSafe, Cloudflare, and OpenRouter decision models send structured descriptions and decode structured score `legend` values. The OpenAI Decisions API accepts only strings, so `OpenAiDecisionModel` rejects structured or `null` values with `InvalidUserInputError` before sending the request.

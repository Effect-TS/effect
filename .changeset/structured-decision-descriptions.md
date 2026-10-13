---
"effect": patch
"@effect/ai-typesafe": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openrouter": patch
---

Accept structured instructions and descriptions in `Decision`. Instructions and descriptions can now be strings, JSON objects, or JSON arrays, and `Decision.classify` option descriptions can be `null`. `Decision.rate` accepts `{ label, description }` levels alongside plain strings and stores every level in that form, so `Rate["criteria"]` is now an array of `{ label, description }`. The TypeSafe, Cloudflare, and OpenRouter decision models send level descriptions, map score indices back to labels, and decode structured score `legend` values.

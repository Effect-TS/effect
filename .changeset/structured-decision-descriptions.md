---
"effect": patch
"@effect/ai-typesafe": patch
"@effect/ai-cloudflare": patch
"@effect/ai-openrouter": patch
"@effect/ai-openai": patch
---

Support structured decision instructions, descriptions, and score legends in TypeSafe, Cloudflare, and OpenRouter. `Decision.rate` accepts labeled descriptions; `Rate.criteria` entries are now `{ label, description }` objects instead of strings.

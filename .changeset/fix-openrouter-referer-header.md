---
"@effect/ai-openrouter": patch
---

Fix typo in HTTP header name: `HTTP-Referrer` → `HTTP-Referer`. The HTTP spec spells it "Referer" (single r), and OpenRouter expects this exact header name for app attribution.

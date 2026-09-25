---
"effect": patch
---

Build `FindMyWay` route params by assignment instead of compiling them with `new Function`, so defining routes no longer attempts string code generation. This avoids CSP `unsafe-eval` violation reports and bundle policies that reject `new Function` (for example Cloudflare Workers), without slowing down parameter matching.

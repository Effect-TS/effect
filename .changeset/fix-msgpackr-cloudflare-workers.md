---
"@effect/rpc": patch
"@effect/platform": patch
---

Update `msgpackr` to 1.11.10 to fix silent decode failures in environments that block `new Function()` at runtime (e.g. Cloudflare Workers). The new version wraps the JIT `new Function()` call in a try/catch, falling back to the interpreted path when dynamic code evaluation is blocked.

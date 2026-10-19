---
"@effect/platform-bun": patch
"@effect/platform-deno": patch
---

Fix request scope leaks when Bun or Deno streaming response bodies are cancelled before their first pull.

---
"@effect/doctest": patch
---

Fix execution of marked TypeScript code fences in ordinary `.md` documents. TypeScript syntax is now compiled before execution, and diagnostics for ordinary document snippets refer to the Markdown filename and line.

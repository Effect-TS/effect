---
"effect": patch
---

Reduce bundle size by letting bundlers drop the `Mime` lookup tables, the `SchemaRepresentation` check annotation schema, and the prototype objects backing `HttpRouter.disableLogger`, SQL statements, `ai/Toolkit`, `cli/Prompt`, and `process/ChildProcess` when they are unused.

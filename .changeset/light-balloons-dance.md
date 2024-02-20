---
"@effect/schema": minor
---

- AST: remove `format`
- remove `Format` module

Before: `AST.format(ast, verbose?)`, Now: `ast.toString(verbose?)`

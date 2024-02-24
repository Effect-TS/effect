---
"@effect/schema": minor
---

AST: remove `format`

Before

```ts
AST.format(ast, verbose?)
```

Now

```ts
ast.toString(verbose?)
```

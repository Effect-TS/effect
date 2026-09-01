---
"effect": patch
---

Expose `SchemaAST` and `SchemaIssue` node constructors through structural instance interfaces instead of concrete class declarations. The constructors remain usable with `new` and `instanceof`, but their `prototype` is no longer part of the public TypeScript API.

`SchemaAST.Base` is no longer exported. Use `SchemaAST.AST` when accepting any AST node, and use the `SchemaAST.is*` guards to narrow individual variants.

---
"@effect/schema": minor
---

AST: switch to classes and remove constructors

Before

```ts
import * as AST from "@effect/schema/AST";

AST.createLiteral("a");
```

Now

```ts
import * as AST from "@effect/schema/AST";

new AST.Literal("a");
```

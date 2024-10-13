---
"effect": minor
---

Merge Schema into Effect.

### Modules

Before

```ts
import {
  Arbitrary,
  AST,
  Equivalence,
  FastCheck,
  JSONSchema,
  ParseResult,
  Pretty,
  Schema,
  Serializable
} from "@effect/schema"
```

After

```ts
import {
  Arbitrary,
  SchemaAST, // changed
  SchemaEquivalence, // changed
  FastCheck,
  JSONSchema,
  ParseResult,
  Pretty,
  Schema,
  Serializable
} from "effect"
```

### Formatters

`ArrayFormatter` / `TreeFormatter` merged into `ParseResult` module.

Before

```ts
import { ArrayFormatter, TreeFormatter } from "@effect/schema"
```

After

```ts
import { ArrayFormatter, TreeFormatter } from "effect/ParseResult"
```

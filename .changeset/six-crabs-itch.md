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
  FastCheck,
  JSONSchema,
  ParseResult,
  Pretty,
  Schema
} from "@effect/schema"
```

After

```ts
import {
  Arbitrary,
  SchemaAST, // changed
  FastCheck,
  JSONSchema,
  ParseResult,
  Pretty,
  Schema
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

### Serializable

Merged into `Schema` module.

### Equivalence

Merged into `Schema` module.

Before

```ts
import { Equivalence } from "@effect/schema"

Equivalence.make(myschema)
```

After

```ts
import { Schema } from "@effect/schema"

Schema.equivalence(myschema)
```

---
"effect": minor
---

Merge Schema into Effect.

Before

```ts
import {
  Arbitrary,
  ArrayFormatter,
  AST,
  Equivalence,
  FastCheck,
  JSONSchema,
  ParseResult,
  Pretty,
  Schema,
  Serializable,
  TreeFormatter
} from "@effect/schema"
```

After

```ts
import {
  Arbitrary,
  SchemaArrayFormatter, // changed
  SchemaAST, // changed
  SchemaEquivalence, // changed
  FastCheck,
  JSONSchema,
  ParseResult,
  Pretty,
  Schema,
  Serializable,
  SchemaTreeFormatter // changed
} from "effect"
```

---
"effect": patch
---

Schema: more precise return types when transformations are involved.

- `Chunk`
- `NonEmptyChunk`
- `Redacted`
- `Option`
- `OptionFromNullOr`
- `OptionFromUndefinedOr`
- `OptionFromNullishOr`
- `Either`
- `EitherFromUnion`
- `ReadonlyMap`
- `Map`
- `HashMap`
- `ReadonlySet`
- `Set`
- `HashSet`
- `List`
- `Cause`
- `Exit`
- `SortedSet`
- `head`
- `headNonEmpty`
- `headOrElse`

**Example** (with `Schema.Chunk`)

Before

```ts
import { Schema } from "effect"

const schema = Schema.Chunk(Schema.Number)

// Property 'from' does not exist on type 'Chunk<typeof Number$>'
schema.from
```

After

```ts
import { Schema } from "effect"

const schema = Schema.Chunk(Schema.Number)

// Schema.Array$<typeof Schema.Number>
schema.from
```

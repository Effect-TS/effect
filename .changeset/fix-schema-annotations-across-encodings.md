---
"effect": patch
---

Keep documentation annotations when lowering a schema whose encoded form differs from its type, closes #7192.

`Schema.toJsonSchemaDocument` builds each node from the last link of the encoding chain, and read annotations only from that link. Any schema that encodes to a different shape therefore lost its `title`, `description`, `examples` and the other JSON Schema annotations — silently, with no error or warning. `Schema.Number` was the most visible case, since it encodes to a union that also accepts `"NaN"`, `"Infinity"` and `"-Infinity"`:

```ts
import { Schema } from "effect"

const schema = Schema.Number.annotate({ description: "d" })

Schema.toJsonSchemaDocument(schema).schema
// before: { anyOf: [{ type: "number" }, { type: "string", enum: ["Infinity", "-Infinity", "NaN"] }] }
// after:  { anyOf: [{ type: "number" }, { type: "string", enum: ["Infinity", "-Infinity", "NaN"] }], description: "d" }
```

`Schema.BigInt`, `Schema.Date`, `Schema.Option`, `Schema.ReadonlyMap`, `Schema.Unknown`, `Schema.Void`, `Schema.Undefined`, `Schema.ObjectKeyword` and `bigint` literals were affected the same way, and are fixed too.

Annotations declared closer to the encoded side still win, so a link that rewrites the shape of the data keeps control of how the result is described.

---
"@effect/platform": patch
---

typecheck path components

```ts
import { Schema } from "effect"
import { HttpApiEndpoint } from "@effect/platform"

const endpoint = HttpApiEndpoint.get("findById", "/:id")
/**
 * Type 'Struct<{}>' is not assignable to type
 * '["Missing path components:", "id"]'
 */
endpoint.setPath(Schema.Struct({}))

/**
 * Type 'Struct<{ id: typeof NumberFromString; id2: typeof NumberFromString; }>'
 * is not assignable to type
 * '["Redundant path components:", "id2" | "id3"]'.
 */
endpoint.setPath(
  Schema.Struct({
    id: Schema.NumberFromString,
    id2: Schema.NumberFromString,
    id3: Schema.NumberFromString
  })
)
```

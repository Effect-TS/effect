---
"effect": minor
---

`FormData` and `FormDataFromSelf` have been added

```ts
import { Schema } from "effect"

const fdSchema = S.FormData(
  S.Struct({
    num: S.NumberFromString
  })
)
const _ = Schema.asSchema(fdSchema) //=> Schema<{ readonly num: number }, FormData>
```

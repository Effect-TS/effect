---
"@effect/schema": patch
---

Add `ReadonlyMapFromRecord` and `MapFromRecord`, closes #3119

- decoding
  - `{ readonly [x: string]: VI }` -> `ReadonlyMap<KA, VA>`
- encoding
  - `ReadonlyMap<KA, VA>` -> `{ readonly [x: string]: VI }`

```ts
import { Schema } from "@effect/schema"

const schema = Schema.ReadonlyMapFromRecord({
  key: Schema.BigInt,
  value: Schema.NumberFromString
})

const decode = Schema.decodeUnknownSync(schema)
const encode = Schema.encodeSync(schema)

console.log(
  decode({
    "1": "4",
    "2": "5",
    "3": "6"
  })
) // Map(3) { 1n => 4, 2n => 5, 3n => 6 }
console.log(
  encode(
    new Map([
      [1n, 4],
      [2n, 5],
      [3n, 6]
    ])
  )
) // { '1': '4', '2': '5', '3': '6' }
```

---
"@effect/schema": patch
---

Stable filters such as `minItems`, `maxItems`, and `itemsCount` now generate multiple errors when the 'errors' option is set to 'all', closes #3633

**Example:**

```ts
import { ArrayFormatter, Schema } from "@effect/schema"

const schema = Schema.Struct({
  tags: Schema.Array(Schema.String.pipe(Schema.minLength(2))).pipe(
    Schema.minItems(3)
  )
})

const invalidData = { tags: ["AB", "B"] }

const either = Schema.decodeUnknownEither(schema, { errors: "all" })(
  invalidData
)
if (either._tag === "Left") {
  console.log(ArrayFormatter.formatErrorSync(either.left))
  /*
  Output:
  [
    {
      _tag: 'Type',
      path: [ 'tags', 1 ],
      message: 'Expected a string at least 2 character(s) long, actual "B"'
    },
    {
      _tag: 'Type',
      path: [ 'tags' ],
      message: 'Expected an array of at least 3 items, actual ["AB","B"]'
    }
  ]
  */
}
```

Previously, only the issue related to the `[ 'tags', 1 ]` path was reported.

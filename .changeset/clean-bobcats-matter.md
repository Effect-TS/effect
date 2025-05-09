---
"effect": minor
---

add `Schema.TaggedUnion` to create discriminiated unions

This allows you to quickly create a serialiable discriminated union with
`_tag`'s for each case.

```ts
import { Schema } from "effect"
import { strictEqual } from "node:assert"

export const HttpError = Schema.TaggedUnion({
  BadRequest: {
    status: Schema.tag(400),
    message: Schema.String
  },
  NotFound: {
    status: Schema.tag(404),
    message: Schema.String
  }
})

// access the member schemas
HttpError.members.BadRequest

// create an instance of a member
const error = HttpError.members.NotFound.make({ message: "Not Found" })

// use the provided $match helper to perform pattern matching
const statusCode = HttpError.$match(error, {
  BadRequest: (e) => e.status,
  NotFound: (e) => e.status
})
strictEqual(statusCode, 404)
```

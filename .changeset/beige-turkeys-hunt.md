---
"@effect/schema": patch
---

Add `filterEffect` API, closes #3165

The `filterEffect` function enhances the `filter` functionality by allowing the integration of effects, thus enabling asynchronous or dynamic validation scenarios. This is particularly useful when validations need to perform operations that require side effects, such as network requests or database queries.

**Example: Validating Usernames Asynchronously**

```ts
import { Schema } from "@effect/schema"
import { Effect } from "effect"

async function validateUsername(username: string) {
  return Promise.resolve(username === "gcanti")
}

const ValidUsername = Schema.String.pipe(
  Schema.filterEffect((username) =>
    Effect.promise(() =>
      validateUsername(username).then((valid) => valid || "Invalid username")
    )
  )
).annotations({ identifier: "ValidUsername" })

Effect.runPromise(Schema.decodeUnknown(ValidUsername)("xxx")).then(console.log)
/*
ParseError: ValidUsername
└─ Transformation process failure
   └─ Invalid username
*/
```

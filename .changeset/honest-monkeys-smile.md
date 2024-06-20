---
"@effect/schema": patch
---

Introducing Customizable Parsing Behavior at the Schema Level, closes #3027

With this latest update, developers can now set specific parse options for each schema using the `parseOptions` annotation. This flexibility allows for precise parsing behaviors across different levels of your schema hierarchy, giving you the ability to override settings in parent schemas and propagate settings to nested schemas as needed.

Here's how you can leverage this new feature:

```ts
import { Schema } from "@effect/schema"
import { Either } from "effect"

const schema = Schema.Struct({
  a: Schema.Struct({
    b: Schema.String,
    c: Schema.String
  }).annotations({
    title: "first error only",
    parseOptions: { errors: "first" } // Only the first error in this sub-schema is reported
  }),
  d: Schema.String
}).annotations({
  title: "all errors",
  parseOptions: { errors: "all" } // All errors in the main schema are reported
})

const result = Schema.decodeUnknownEither(schema)(
  { a: {} },
  { errors: "first" }
)
if (Either.isLeft(result)) {
  console.log(result.left.message)
}
/*
all errors
├─ ["d"]
│  └─ is missing
└─ ["a"]
   └─ first error only
      └─ ["b"]
         └─ is missing
*/
```

**Detailed Output Explanation:**

In this example:

- The main schema is configured to display all errors. Hence, you will see errors related to both the `d` field (since it's missing) and any errors from the `a` subschema.
- The subschema (`a`) is set to display only the first error. Although both `b` and `c` fields are missing, only the first missing field (`b`) is reported.

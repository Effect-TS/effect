---
"@effect/schema": patch
---

Add `encodedBoundSchema` API.

The `encodedBoundSchema` function is similar to `encodedSchema` but preserves the refinements up to the first transformation point in the
original schema.

**Function Signature:**

```ts
export const encodedBoundSchema = <A, I, R>(schema: Schema<A, I, R>): Schema<I>
```

The term "bound" in this context refers to the boundary up to which refinements are preserved when extracting the encoded form of a schema. It essentially marks the limit to which initial validations and structure are maintained before any transformations are applied.

**Example Usage:**

```ts
import { Schema } from "@effect/schema"

const schema = Schema.Struct({
  foo: Schema.String.pipe(Schema.minLength(3), Schema.compose(Schema.Trim))
})

// The resultingEncodedBoundSchema preserves the minLength(3) refinement,
// ensuring the string length condition is enforced but omits the Trim transformation.
const resultingEncodedBoundSchema = Schema.encodedBoundSchema(schema)

// resultingEncodedBoundSchema is the same as:
Schema.Struct({
  foo: Schema.String.pipe(Schema.minLength(3))
})
```

In the provided example:

- **Initial Schema**: The schema for `foo` includes a refinement to ensure strings have a minimum length of three characters and a transformation to trim the string.
- **Resulting Schema**: `resultingEncodedBoundSchema` maintains the `minLength(3)` condition, ensuring that this validation persists. However, it excludes the trimming transformation, focusing solely on the length requirement without altering the string's formatting.

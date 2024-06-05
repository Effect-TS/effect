---
"@effect/schema": patch
---

Add `propertyOrder` option to `ParseOptions` to control the order of keys in the output, closes #2925.

The `propertyOrder` option provides control over the order of object fields in the output. This feature is particularly useful when the sequence of keys is important for the consuming processes or when maintaining the input order enhances readability and usability.

By default, the `propertyOrder` option is set to `"none"`. This means that the internal system decides the order of keys to optimize parsing speed. The order of keys in this mode should not be considered stable, and it's recommended not to rely on key ordering as it may change in future updates without notice.

Setting `propertyOrder` to `"input"` ensures that the keys are ordered as they appear in the input during the decoding/encoding process.

**Example** (Synchronous Decoding)

```ts
import { Schema } from "@effect/schema"

const schema = Schema.Struct({
  a: Schema.Number,
  b: Schema.Literal("b"),
  c: Schema.Number
})

// Decoding an object synchronously without specifying the property order
console.log(Schema.decodeUnknownSync(schema)({ b: "b", c: 2, a: 1 }))
// Output decided internally: { b: 'b', a: 1, c: 2 }

// Decoding an object synchronously while preserving the order of properties as in the input
console.log(
  Schema.decodeUnknownSync(schema)(
    { b: "b", c: 2, a: 1 },
    { propertyOrder: "original" }
  )
)
// Output preserving input order: { b: 'b', c: 2, a: 1 }
```

**Example** (Asynchronous Decoding)

```ts
import { ParseResult, Schema } from "@effect/schema"
import type { Duration } from "effect"
import { Effect } from "effect"

// Function to simulate an asynchronous process within the schema
const effectify = (duration: Duration.DurationInput) =>
  Schema.Number.pipe(
    Schema.transformOrFail(Schema.Number, {
      decode: (x) =>
        Effect.sleep(duration).pipe(Effect.andThen(ParseResult.succeed(x))),
      encode: ParseResult.succeed
    })
  )

// Define a structure with asynchronous behavior in each field
const schema = Schema.Struct({
  a: effectify("200 millis"),
  b: effectify("300 millis"),
  c: effectify("100 millis")
}).annotations({ concurrency: 3 })

// Decoding data asynchronously without preserving order
Schema.decode(schema)({ a: 1, b: 2, c: 3 })
  .pipe(Effect.runPromise)
  .then(console.log)
// Output decided internally: { c: 3, a: 1, b: 2 }

// Decoding data asynchronously while preserving the original input order
Schema.decode(schema)({ a: 1, b: 2, c: 3 }, { propertyOrder: "original" })
  .pipe(Effect.runPromise)
  .then(console.log)
// Output preserving input order: { a: 1, b: 2, c: 3 }
```

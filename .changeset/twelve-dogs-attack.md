---
"@effect/schema": patch
---

Implement `DecodingFallbackAnnotation` to manage decoding errors.

```ts
export type DecodingFallbackAnnotation<A> = (
  issue: ParseIssue
) => Effect<A, ParseIssue>
```

This update introduces a `decodingFallback` annotation, enabling custom handling of decoding failures in schemas. This feature allows developers to specify fallback behaviors when decoding operations encounter issues.

**Example**

```ts
import { Schema } from "@effect/schema"
import { Effect, Either } from "effect"

// Basic Fallback

const schema = Schema.String.annotations({
  decodingFallback: () => Either.right("<fallback>")
})

console.log(Schema.decodeUnknownSync(schema)("valid input")) // Output: valid input
console.log(Schema.decodeUnknownSync(schema)(null)) // Output: <fallback value>

// Advanced Fallback with Logging

const schemaWithLog = Schema.String.annotations({
  decodingFallback: (issue) =>
    Effect.gen(function* () {
      yield* Effect.log(issue._tag)
      yield* Effect.sleep(10)
      return yield* Effect.succeed("<fallback2>")
    })
})

Effect.runPromise(Schema.decodeUnknown(schemaWithLog)(null)).then(console.log)
/*
Output:
timestamp=2024-07-25T13:22:37.706Z level=INFO fiber=#0 message=Type
<fallback2>
*/
```

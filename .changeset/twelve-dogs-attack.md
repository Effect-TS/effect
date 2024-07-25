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
  decodingFallback: () => Either.right("<default>")
})

console.log(Schema.decodeUnknownSync(schema)("foo")) // foo
console.log(Schema.decodeUnknownSync(schema)(null)) // <default>

// Advanced Fallback with Logging

const schemaWithLog = Schema.String.annotations({
  decodingFallback: (issue) =>
    Effect.gen(function* () {
      yield* Effect.log(issue._tag)
      yield* Effect.sleep(10)
      return yield* Effect.succeed("<default2>")
    })
})

Effect.runPromise(Schema.decodeUnknown(schemaWithLog)(null)).then(console.log)
/*
timestamp=2024-07-25T13:22:37.706Z level=INFO fiber=#0 message=Type
<default2>
*/
```

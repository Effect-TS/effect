---
"effect": patch
---

ParseResult.ArrayFormatter: correct `_tag` fields for `Refinement` and `Transformation` issues, closes #4564.

This update fixes an issue where `ParseResult.ArrayFormatter` incorrectly labeled **Refinement** and **Transformation** errors as `Type` in the output.

**Before**

```ts
import { Effect, ParseResult, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.NonEmptyString,
  b: Schema.NumberFromString
})

const input = { a: "", b: "" }

const program = Schema.decodeUnknown(schema, { errors: "all" })(input).pipe(
  Effect.catchTag("ParseError", (err) =>
    ParseResult.ArrayFormatter.formatError(err).pipe(
      Effect.map((err) => JSON.stringify(err, null, 2))
    )
  )
)

program.pipe(Effect.runPromise).then(console.log)
/*
[
  {
    "_tag": "Type", ❌
    "path": [
      "a"
    ],
    "message": "Expected a non empty string, actual \"\""
  },
  {
    "_tag": "Type", ❌
    "path": [
      "b"
    ],
    "message": "Unable to decode \"\" into a number"
  }
]
*/
```

**After**

```ts
import { Effect, ParseResult, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.NonEmptyString,
  b: Schema.NumberFromString
})

const input = { a: "", b: "" }

const program = Schema.decodeUnknown(schema, { errors: "all" })(input).pipe(
  Effect.catchTag("ParseError", (err) =>
    ParseResult.ArrayFormatter.formatError(err).pipe(
      Effect.map((err) => JSON.stringify(err, null, 2))
    )
  )
)

program.pipe(Effect.runPromise).then(console.log)
/*
[
  {
    "_tag": "Refinement", ✅
    "path": [
      "a"
    ],
    "message": "Expected a non empty string, actual \"\""
  },
  {
    "_tag": "Transformation", ✅
    "path": [
      "b"
    ],
    "message": "Unable to decode \"\" into a number"
  }
]
*/
```

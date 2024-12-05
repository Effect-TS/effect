---
"effect": patch
---

Preserve `MissingMessageAnnotation`s on property signature declarations when another field is a property signature transformation.

Before

```ts
import { Console, Effect, ParseResult, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.String).annotations({
    missingMessage: () => "message1"
  }),
  b: Schema.propertySignature(Schema.String)
    .annotations({ missingMessage: () => "message2" })
    .pipe(Schema.fromKey("c")), // <= transformation
  d: Schema.propertySignature(Schema.String).annotations({
    missingMessage: () => "message3"
  })
})

Effect.runPromiseExit(
  Schema.decodeUnknown(schema, { errors: "all" })({}).pipe(
    Effect.tapError((error) =>
      Console.log(ParseResult.ArrayFormatter.formatErrorSync(error))
    )
  )
)
/*
Output:
[
  { _tag: 'Missing', path: [ 'a' ], message: 'is missing' }, // <= wrong
  { _tag: 'Missing', path: [ 'c' ], message: 'message2' },
  { _tag: 'Missing', path: [ 'd' ], message: 'is missing' } // <= wrong
]
*/
```

After

```ts
import { Console, Effect, ParseResult, Schema } from "effect"

const schema = Schema.Struct({
  a: Schema.propertySignature(Schema.String).annotations({
    missingMessage: () => "message1"
  }),
  b: Schema.propertySignature(Schema.String)
    .annotations({ missingMessage: () => "message2" })
    .pipe(Schema.fromKey("c")), // <= transformation
  d: Schema.propertySignature(Schema.String).annotations({
    missingMessage: () => "message3"
  })
})

Effect.runPromiseExit(
  Schema.decodeUnknown(schema, { errors: "all" })({}).pipe(
    Effect.tapError((error) =>
      Console.log(ParseResult.ArrayFormatter.formatErrorSync(error))
    )
  )
)
/*
Output:
[
  { _tag: 'Missing', path: [ 'a' ], message: 'message1' },
  { _tag: 'Missing', path: [ 'c' ], message: 'message2' },
  { _tag: 'Missing', path: [ 'd' ], message: 'message3' }
]
*/
```

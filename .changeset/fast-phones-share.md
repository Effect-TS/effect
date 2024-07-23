---
"@effect/schema": minor
---

## Codemod

For some of the breking changes, a code-mod has been released to make migration as easy as possible.

You can run it by executing:

```bash
npx @effect/codemod schema-0.69 src/**/*
```

It might not be perfect - if you encounter issues, let us know! Also make sure you commit any changes before running it, in case you need to revert anything.

## Breaking Changes

### Schema

- We've improved the `TaggedRequest` API to make it more intuitive by grouping parameters into a single object (**codmod**), closes #3144

  Before Update

  ```ts
  class Sample extends Schema.TaggedRequest<Sample>()(
    "Sample",
    Schema.String, // Failure Schema
    Schema.Number, // Success Schema
    { id: Schema.String, foo: Schema.Number } // Payload Schema
  ) {}
  ```

  After Update

  ```ts
  class Sample extends Schema.TaggedRequest<Sample>()("Sample", {
    payload: {
      id: Schema.String,
      foo: Schema.Number
    },
    success: Schema.Number,
    failure: Schema.String
  }) {}
  ```

- change `TaggedRequestClass` type parameters order (swap `Success` with `Failure`)
- simplify `TaggedRequest.Any`, use `TaggedRequest.All` instead
- To improve clarity, we have renamed `nonEmpty` filter to `nonEmptyString` and `NonEmpty` schema to `NonEmptyString` (**codmod**), closes #3115
- The `Record` constructor now consistently accepts an object argument, aligning it with similar constructors such as `Map` and `HashMap` (**codmod**), closes #2793

  Before Update

  ```ts
  import { Schema } from "@effect/schema"

  const schema = Schema.Record(Schema.String, Schema.Number)
  ```

  After Update

  ```ts
  import { Schema } from "@effect/schema"

  const schema = Schema.Record({ key: Schema.String, value: Schema.Number })
  ```

- rename `Base64` to `Uint8ArrayFromBase64` (**codmod**)
- rename `Base64Url` to `Uint8ArrayFromBase64Url` (**codmod**)
- rename `Hex` to `Uint8ArrayFromHex` (**codmod**)
- make `defect` schema required in `ExitFromSelf`, `Exit`, `CauseFromSelf`, `CauseFromSelf` (**codmod**)
  This is for two reasons:

  1. The optionality of `defect` caused inference issues when the schema was declared within a Struct. In such cases, the `R` type of the schema was erroneously inferred as `unknown` instead of `never`.
  2. In general, schema definitions such as `Schema.ExitFromSelf` or `Schema.Exit` shouldn't have a default. The user should actively choose them to avoid hidden behaviors.

- rename `CauseDefectUnknown` to `Defect` (**codmod**)
- fix `Schema.Void` behavior: now accepts any value instead of only validating `undefined`, closes #3297
- rename `optionalWithOptions` interface to `optionalWith`
- We've refined the `optional` and `partial` APIs by splitting them into two distinct methods: one without options (`optional` and `partial`) and another with options (`optionalWith` and `partialWith`). This change resolves issues with previous implementations when used with the `pipe` method:

  ```ts
  Schema.String.pipe(Schema.optional)
  ```

### ParseResult

- `Missing`: change `ast` field from `AST.Annotated` to `AST.Type`
- `Composite`: change `ast` field from `AST.Annotated` to `AST.AST`
- `Type`: change `ast` field from `AST.Annotated` to `AST.AST`
- `Forbidden`: change `ast` field from `AST.Annotated` to `AST.AST`

### AST

- pass the input of the transformation to `transform` and `transformOrFail` APIs
- fix `TemplateLiteralSpan.toString` implementation by returning both its type and its literal

  Before

  ```ts
  import { AST } from "@effect/schema"

  console.log(String(new AST.TemplateLiteralSpan(AST.stringKeyword, "a"))) // ${string}
  ```

  Now

  ```ts
  import { AST } from "@effect/schema"

  console.log(String(new AST.TemplateLiteralSpan(AST.stringKeyword, "a"))) // ${string}a
  ```

### Serializable

- change `WithResult` fields to standard lowercase (`Success` -> `success`, `Failure` -> `failure`)
- rename `WithResult.Error` to `WithResult.Failure`

## New Features

### Schema

- add `StringFromBase64` transformation
- add `StringFromBase64Url` transformation
- add `StringFromHex` transformation
- add `TaggedRequest.All`
- Support for extending `Schema.String`, `Schema.Number`, and `Schema.Boolean` with refinements has been added:

  ```ts
  import { Schema } from "@effect/schema"

  const Integer = Schema.Int.pipe(Schema.brand("Int"))
  const Positive = Schema.Positive.pipe(Schema.brand("Positive"))

  // Schema.Schema<number & Brand<"Positive"> & Brand<"Int">, number, never>
  const PositiveInteger = Schema.asSchema(Schema.extend(Positive, Integer))

  Schema.decodeUnknownSync(PositiveInteger)(-1)
  /*
  throws
  ParseError: Int & Brand<"Int">
  └─ From side refinement failure
    └─ Positive & Brand<"Positive">
        └─ Predicate refinement failure
          └─ Expected Positive & Brand<"Positive">, actual -1
  */

  Schema.decodeUnknownSync(PositiveInteger)(1.1)
  /*
  throws
  ParseError: Int & Brand<"Int">
  └─ Predicate refinement failure
    └─ Expected Int & Brand<"Int">, actual 1.1
  */
  ```

### Serializable

- add `WithResult.SuccessEncoded`
- add `WithResult.FailureEncoded`
- add `WithResult.Any`
- add `WithResult.All`
- add `asWithResult`
- add `Serializable.Any`
- add `Serializable.All`
- add `asSerializable`
- add `SerializableWithResult.Any`
- add `SerializableWithResult.All`
- add `asSerializableWithResult`

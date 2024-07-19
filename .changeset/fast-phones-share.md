---
"@effect/schema": patch
---

TODO: change to minor before merging

## Breaking Changes

### Schema

- change `TaggedRequest` signature, closes #3144

  from

  ```ts
  class Sample extends Schema.TaggedRequest<Sample>()(
    "Sample",
    Schema.String,
    Schema.Number,
    { id: Schema.String, foo: Schema.Number }
  ) {}
  ```

  to

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
- rename `nonEmpty` filter to `nonEmptyString` and `NonEmpty` schema to `NonEmptyString`, closes #3115
- aligned `Record` constructor to consistently accept object argument (like `Map`, `HashMap`, etc...), closes #2793

  Before

  ```ts
  import { Schema } from "@effect/schema"

  const schema = Schema.Record(Schema.String, Schema.Number)
  ```

  Now

  ```ts
  import { Schema } from "@effect/schema"

  const schema = Schema.Record({ key: Schema.String, value: Schema.Number })
  ```

- add support for refinements to `extend`
- rename `Base64` to `Uint8ArrayFromBase64`
- rename `Base64Url` to `Uint8ArrayFromBase64Url`
- rename `Hex` to `Uint8ArrayFromHex`
- make `defect` schema required in `ExitFromSelf`, `Exit`, `CauseFromSelf`, `CauseFromSelf`
  This is for two reasons:

  1. The optionality of `defect` caused inference issues when the schema was declared within a Struct. In such cases, the `R` type of the schema was erroneously inferred as `unknown` instead of `never`.
  2. In general, schema definitions such as `Schema.ExitFromSelf` or `Schema.Exit` shouldn't have a default. The user should actively choose them to avoid hidden behaviors.

- rename `CauseDefectUnknown` to `Defect`
- make `CauseFromSelf` and `Cause` more general by accepting a generic schema as the `defect` argument instead of `Schema<unknown, unknown, DR>`
- make `ExitFromSelf` and `Exit` more general by accepting a generic schema as the `defect` argument instead of `Schema<unknown, unknown, DR>`
- fix `Schema.Void` behavior: now accepts any value instead of only validating `undefined`, closes #3297

### AST

- pass the input of the transformation to `transform` and `transformOrFail` APIs
- fix `TemplateLiteralSpan.toString` implementation

### Serializable

- add `defect` field to `symbolExit` field
- change `WithResult` fields to standard lowercase (`Success` -> `success`, `Failure` -> `failure`)
- rename `WithResult.Error` to `WithResult.Failure`

## New Features

### Schema

- add `StringFromBase64`
- add `StringFromBase64Url`
- add `StringFromHex`
- add `TaggedRequest.All`
- add support for `Schema.String`/`Schema.Number`/`Schema.Boolean` refinements to `extend`

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

---
"@effect/schema": patch
---

TODO: change to minor before merging

## Breaking Changes

### Schema

- change `TaggedRequest` signature (**codmod**), closes #3144

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
- rename `nonEmpty` filter to `nonEmptyString` and `NonEmpty` schema to `NonEmptyString` (**codmod**), closes #3115
- aligned `Record` constructor to consistently accept object argument (like `Map`, `HashMap`, etc...) (**codmod**), closes #2793

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
- split `optional` API into `optional` (without options) and `optionalWith` (with options) (**codmod**)
  This change addresses issues caused by the previous signature when used tacitly with `pipe`:

  ```ts
  Schema.String.pipe(Schema.optional)
  ```

- split `partial` API into `partial` (without options) and `partialWith` (with options) (**codmod**)

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

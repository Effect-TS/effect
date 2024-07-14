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

### Serializable

- rename `WithResult` interface to `WithExit`
- rename `WithResult` namespace to `WithExit`
- change `WithExit` fields to lowercase (`Success` -> `success`, `Failure` -> `failure`)
- rename `WithExit.Error` to `WithExit.Failure`
- rename `symbolResult` symbol to `symbolExit`
- rename `SerializableWithResult` interface to `SerializableWithExit`
- rename `SerializableWithResult` namespace to `SerializableWithExit`

## New Features

### Schema

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

- add `WithExit.SuccessEncoded`
- add `WithExit.FailureEncoded`
- add `WithExit.Any`
- add `WithExit.All`
- add `asWithExit`
- add `Serializable.Any`
- add `Serializable.All`
- add `asSerializable`
- add `SerializableWithExit.Any`
- add `SerializableWithExit.All`
- add `asSerializableWithExit`

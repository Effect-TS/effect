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

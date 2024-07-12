---
"@effect/schema": patch
---

TOOD: change to minor before merging

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

### Serializable

- change `WithResult` fields to lowercase (`Success` -> `success`, `Failure` -> `failure`)
- rename `WithResult.Error` to `WithResult.Failure`

## New Features

### Schema

- add `TaggedRequest.All`

### Serializable

- add `WithResult.SuccessEncoded`
- add `WithResult.FailureEncoded`
- add `WithResult.Any`
- add `WithResult.All`
- add `asWithResult`
- add `Serializable.Any`
- add `Serializable.All`
- add `asSerializable`

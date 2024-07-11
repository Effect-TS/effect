---
"@effect/schema": patch
---

TOOD: change to minor before merging

**Breaking Changes**

- change `TaggedRequest` signature from

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
- change `WithResult` fields to lowercase (`Success` -> `success`, `Failure` -> `failure`)
- rename `WithResult.Error` to `WithResult.Failure`

**New Features**

- add `WithResult.SuccessEncoded`
- add `WithResult.FailureEncoded`
- add `WithResult.Any`
- add `WithResult.All`
- add `TaggedRequest.All`

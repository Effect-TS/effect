---
"@effect/rpc": minor
---

## Breaking Changes

### Rpc

- align `StreamRequest` signature to `Schema.TaggedRequest` signature (`options` argument)

  from

  ```ts
  import * as Rpc from "@effect/rpc/Rpc"
  import { Schema } from "@effect/schema"

  export class Counts extends Rpc.StreamRequest<Counts>()(
    "Counts",
    Schema.Never, // Indicates that no errors are expected
    Schema.Number, // Specifies that the response is a number
    {}
  ) {}
  ```

  to

  ```ts
  import * as Rpc from "@effect/rpc/Rpc"
  import { Schema } from "@effect/schema"

  export class Counts extends Rpc.StreamRequest<Counts>()("Counts", {
    failure: Schema.Never, // Indicates that no errors are expected
    success: Schema.Number, // Specifies that the response is a number
    payload: {}
  }) {}
  ```

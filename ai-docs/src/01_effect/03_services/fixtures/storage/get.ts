// file: src/storage/get.ts
import { Context, Effect, Option } from "effect"
import { Bucket, StorageError } from "./Bucket.ts"

// One operation per module. `Context.overridable` keeps the default
// implementation here, and exposes `get.reference` so a test or a composition
// root can swap it. The default reads the shared `Bucket` through its own `R`,
// which is how an overridable depends on the platform.
export const get = Context.overridable(
  "myapp/storage/get",
  Effect.fn("Storage.get")(function*(key: string) {
    const bucket = yield* Bucket
    const value = yield* Effect.tryPromise({
      try: () => bucket.get(key),
      catch: (cause) => new StorageError({ cause })
    })
    return Option.fromNullOr(value)
  })
)

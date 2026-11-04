// file: src/storage/list.ts
import { Context, Effect } from "effect"
import { Bucket, StorageError } from "./Bucket.ts"

// Nothing in the production root imports this module, so a bundler leaves it
// out of the build even though it is part of the same storage code.
export const list = Context.overridable(
  "myapp/storage/list",
  Effect.fn("Storage.list")(function*(prefix: string) {
    const bucket = yield* Bucket
    const objects = yield* Effect.tryPromise({
      try: () => bucket.list({ prefix }),
      catch: (cause) => new StorageError({ cause })
    })
    return objects.map((object) => object.key)
  })
)

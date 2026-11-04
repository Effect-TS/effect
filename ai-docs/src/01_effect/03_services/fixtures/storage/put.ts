// file: src/storage/put.ts
import { Context, Effect } from "effect"
import { Bucket, StorageError } from "./Bucket.ts"

export const put = Context.overridable(
  "myapp/storage/put",
  Effect.fn("Storage.put")(function*(key: string, value: string) {
    const bucket = yield* Bucket
    yield* Effect.tryPromise({
      try: () => bucket.put(key, value),
      catch: (cause) => new StorageError({ cause })
    })
  })
)

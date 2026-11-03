// file: src/storage/list.ts
import { Effect, Layer } from "effect"
import { Bucket } from "./Bucket.ts"
import { Storage, StorageError } from "./Storage.ts"

// Nothing in the example imports this module, so a bundler leaves it out of
// the build even though it implements a member of the same service.
export const StorageListLayer = Layer.effectOnly(
  Storage,
  "list",
  Effect.gen(function*() {
    const bucket = yield* Bucket
    return Effect.fn("Storage.list")((prefix: string) =>
      Effect.tryPromise({
        try: () => bucket.list({ prefix }),
        catch: (cause) => new StorageError({ cause })
      }).pipe(Effect.map((objects) => objects.map((object) => object.key)))
    )
  })
)

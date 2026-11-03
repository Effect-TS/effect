// file: src/storage/put.ts
import { Effect, Layer } from "effect"
import { Bucket } from "./Bucket.ts"
import { Storage, StorageError } from "./Storage.ts"

export const StoragePutLayer = Layer.effect(
  Storage.only("put"),
  Effect.gen(function*() {
    const bucket = yield* Bucket
    return Effect.fn("Storage.put")((key: string, value: string) =>
      Effect.tryPromise({
        try: () => bucket.put(key, value),
        catch: (cause) => new StorageError({ cause })
      })
    )
  })
)

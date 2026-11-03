// file: src/storage/get.ts
import { Effect, Layer, Option } from "effect"
import { Bucket } from "./Bucket.ts"
import { Storage, StorageError } from "./Storage.ts"

// One member per module. `Layer.effectOnly` builds the member with access to
// the shared Bucket, and the layer provides `Context.Only<Storage, "get">`:
// enough for programs that call `Storage.only("get")`, and nothing more.
export const StorageGetLayer = Layer.effectOnly(
  Storage,
  "get",
  Effect.gen(function*() {
    const bucket = yield* Bucket
    return Effect.fn("Storage.get")((key: string) =>
      Effect.tryPromise({
        try: () => bucket.get(key),
        catch: (cause) => new StorageError({ cause })
      }).pipe(Effect.map(Option.fromNullOr))
    )
  })
)

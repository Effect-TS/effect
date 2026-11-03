// file: src/worker.ts
import { Effect, Layer } from "effect"
import { Bucket, type BucketClient } from "./storage/Bucket.ts"
import { copyKey } from "./storage/copyKey.ts"
import { StorageGetLayer } from "./storage/get.ts"
import { StoragePutLayer } from "./storage/put.ts"

// The production composition root. It imports only the member modules the
// program needs, so `src/storage/list.ts` is never in the bundle. The shared
// `Bucket` is the platform binding itself and is provided from the Worker
// environment, so the root contains no implementation of any other member.
// Leaving out a member the program uses is a type error that names the missing
// slice, for example `Context.Only<Storage, "put">`.
export const StorageLayer = Layer.mergeAll(StorageGetLayer, StoragePutLayer)

export const handler = (env: { readonly MY_BUCKET: BucketClient }) =>
  copyKey("greeting", "greeting-copy").pipe(
    Effect.provide(StorageLayer.pipe(Layer.provide(Layer.succeed(Bucket, env.MY_BUCKET)))),
    Effect.runPromise
  )

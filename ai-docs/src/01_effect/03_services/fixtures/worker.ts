// file: src/worker.ts
import { Effect, Layer } from "effect"
import { Bucket, type BucketClient } from "./storage/Bucket.ts"
import { copyKey } from "./storage/copyKey.ts"

// The production composition root. It imports only the program it runs, and
// the program imports only the operations it calls, so `src/storage/list.ts`
// is never in the bundle. The shared `Bucket` is the platform binding itself
// and is provided from the Worker environment. No operation needs to be
// provided: each one runs its default implementation unless overridden.
export const handler = (env: { readonly MY_BUCKET: BucketClient }) =>
  copyKey("greeting", "greeting-copy").pipe(
    Effect.provide(Layer.succeed(Bucket, env.MY_BUCKET)),
    Effect.runPromise
  )

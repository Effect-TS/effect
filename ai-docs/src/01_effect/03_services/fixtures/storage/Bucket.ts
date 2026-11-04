// file: src/storage/Bucket.ts
import { Context, Schema } from "effect"

// The platform binding every operation talks to, for example a Cloudflare R2
// bucket or KV namespace. It is the shared kernel of the storage code: small,
// and loaded by whichever operations the composition root imports.
export interface BucketClient {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  list(options: { readonly prefix: string }): Promise<ReadonlyArray<{ readonly key: string }>>
}

export class Bucket extends Context.Service<Bucket, BucketClient>()("myapp/storage/Bucket") {}

export class StorageError extends Schema.TaggedError<StorageError>()("StorageError", {
  cause: Schema.Defect()
}) {}

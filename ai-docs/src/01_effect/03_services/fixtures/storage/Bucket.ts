// file: src/storage/Bucket.ts
import { Context } from "effect"

// The platform binding every member talks to, for example a Cloudflare R2
// bucket or KV namespace. It is the shared kernel of the service: small, and
// loaded by whichever members the composition root provides.
export interface BucketClient {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
  list(options: { readonly prefix: string }): Promise<ReadonlyArray<{ readonly key: string }>>
}

export class Bucket extends Context.Service<Bucket, BucketClient>()("myapp/storage/Bucket") {}

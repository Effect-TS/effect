import type { D1Database } from "@cloudflare/workers-types"
import { D1Client } from "@effect/sql-d1"
import { Config, Context, Data, Effect, Layer } from "effect"
import { Miniflare } from "miniflare"

export class MiniflareError extends Data.TaggedError("MiniflareError")<{
  cause: unknown
}> {}

export class D1Miniflare extends Context.Tag("test/D1Miniflare")<
  D1Miniflare,
  Miniflare
>() {
  static Live = Layer.scoped(
    this,
    Effect.acquireRelease(
      Effect.try({
        try: () =>
          new Miniflare({
            modules: true,
            d1Databases: {
              DB: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            },
            script: ""
          }),
        catch: (cause) => new MiniflareError({ cause })
      }),
      (miniflare) => Effect.promise(() => miniflare.dispose())
    )
  )

  static ClientLive = Layer.unwrapEffect(
    Effect.gen(function*() {
      const miniflare = yield* D1Miniflare
      const db: D1Database = yield* Effect.tryPromise(() => miniflare.getD1Database("DB"))
      return D1Client.layer({
        db: Config.succeed(db)
      })
    })
  ).pipe(Layer.provide(this.Live))
}

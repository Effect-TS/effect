import { CloudflareScheduler, layer } from "@effect/platform-cloudflare/CloudflareScheduler"
import { Deferred, Effect, Layer, ManagedRuntime } from "effect"

const deferred = Deferred.makeUnsafe<void>()
const scheduler = new CloudflareScheduler()
let done = false
let initialized = false
const runtime = ManagedRuntime.make(
  Layer.effectDiscard(Deferred.await(deferred)).pipe(Layer.provideMerge(layer))
)

export default {
  async fetch(request: Request) {
    switch (new URL(request.url).pathname) {
      case "/start": {
        runtime.runFork(
          Effect.sync(() => {
            initialized = true
          }),
          { scheduler }
        )
        Effect.runFork(
          Deferred.await(deferred).pipe(Effect.andThen(Effect.sync(() => {
            done = true
          }))),
          { scheduler }
        )
        return Response.json("started")
      }
      case "/resume": {
        await Effect.runPromise(Deferred.succeed(deferred, undefined), { scheduler })
        return Response.json({ done, initialized })
      }
      default:
        return Response.json({ done, initialized })
    }
  }
}

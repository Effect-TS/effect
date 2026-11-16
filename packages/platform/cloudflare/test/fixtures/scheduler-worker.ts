import { CloudflareScheduler } from "@effect/platform-cloudflare/CloudflareScheduler"
import { Deferred, Effect } from "effect"

const deferred = Deferred.makeUnsafe<void>()
const scheduler = new CloudflareScheduler()
let done = false

export default {
  async fetch(request: Request) {
    switch (new URL(request.url).pathname) {
      case "/start": {
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
        return Response.json({ done })
      }
      default:
        return Response.json({ done })
    }
  }
}

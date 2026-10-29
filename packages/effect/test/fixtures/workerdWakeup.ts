import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import { AsyncLocalStorage } from "node:async_hooks"

const storage = new AsyncLocalStorage<string>()
let waiter: Deferred.Deferred<void> | undefined

const current = Effect.sync(() => storage.getStore())

// The waiter's timeout keeps its request alive while another request wakes it.
const wait = Effect.gen(function*() {
  waiter = Deferred.makeUnsafe<void>()
  yield* Deferred.await(waiter).pipe(Effect.timeout("5 seconds"))
  const afterWake = yield* current
  yield* Effect.promise(() => Promise.resolve())
  const afterPromise = yield* current
  return { afterWake, afterPromise }
})

const wake = Effect.suspend(() => {
  if (waiter === undefined) return Effect.succeed(undefined)
  return Deferred.succeed(waiter, undefined).pipe(Effect.andThen(current))
})

export default {
  fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const store = url.searchParams.get("store")!
    return storage.run(store, async () => {
      try {
        const result = await Effect.runPromise(url.pathname === "/wait" ? wait : wake)
        return Response.json(result ?? null)
      } catch (error) {
        return new Response(String(error), { status: 500 })
      }
    })
  }
}

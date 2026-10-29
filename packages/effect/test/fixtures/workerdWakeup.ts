import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { AsyncLocalStorage } from "node:async_hooks"

const storage = new AsyncLocalStorage<string>()
let waiter: Deferred.Deferred<void> | undefined
let childStarted = false
let suspended: { readonly fiber: Fiber.Fiber<unknown, unknown>; readonly deferred: Deferred.Deferred<void> } | undefined

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

const suspend = <A>(effect: (deferred: Deferred.Deferred<void>) => Effect.Effect<A>) => {
  const deferred = Deferred.makeUnsafe<void>()
  const fiber = Effect.runFork(effect(deferred))
  suspended = { fiber, deferred }
  return new Promise<Exit.Exit<A>>((resolve) => fiber.addObserver(resolve))
}

const routes: Record<string, (url: URL) => unknown> = {
  "/wait": () => Effect.runPromise(wait),
  "/wake": () => Effect.runPromise(wake),
  "/interruptible": async () => {
    const finalizers: Array<string | undefined> = []
    const exit = await suspend((deferred) =>
      Deferred.await(deferred).pipe(Effect.ensuring(Effect.sync(() => finalizers.push(storage.getStore()))))
    )
    return { interrupted: Exit.hasInterrupts(exit), finalizers }
  },
  "/interrupt-and-wake": (url) => {
    if (suspended === undefined) return undefined
    const { deferred, fiber } = suspended
    const interrupt = () => fiber.interruptUnsafe()
    const wake = () => Deferred.doneUnsafe(deferred, Effect.void)
    if (url.searchParams.get("order") === "interrupt-first") {
      interrupt()
      wake()
    } else {
      wake()
      interrupt()
    }
    return storage.getStore()
  },
  "/fork-after-wake": async () => {
    const exit = await suspend((deferred) =>
      Effect.gen(function*() {
        yield* Deferred.await(deferred)
        const child = yield* Effect.forkChild(Effect.sync(() => {
          childStarted = true
          return storage.getStore()
        }))
        return yield* Fiber.join(child)
      })
    )
    return Exit.isSuccess(exit) ? exit.value : String(exit.cause)
  },
  "/wake-with-armed-dispatcher": async () => {
    if (suspended === undefined) return undefined
    const { deferred, fiber } = suspended
    // Keep the waiter's dispatcher armed from this request, so the child it
    // forks after waking first runs from this request's timer.
    const dispatcher = fiber.currentDispatcher
    let ticks = 0
    await new Promise<void>((resolve) => {
      const rearm = () => {
        if (childStarted || ++ticks > 1_000) return resolve()
        dispatcher.scheduleTask(rearm, 0)
      }
      rearm()
      Deferred.doneUnsafe(deferred, Effect.void)
    })
    return storage.getStore()
  },
  // Leaves a fiber yielding on timers owned by this request after it responds.
  "/spin": () => {
    Effect.runFork(Effect.forever(Effect.yieldNow))
    return storage.getStore()
  },
  "/yield": () => Effect.runPromise(Effect.andThen(Effect.yieldNow, current))
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const store = url.searchParams.get("store")!
    // Keeps a waiting request alive while another request wakes it.
    const keepAlive = url.searchParams.has("keepAlive") ? setTimeout(() => {}, 5_000) : undefined
    try {
      return await storage.run(store, async () => {
        const result = await routes[url.pathname](url)
        return Response.json(result ?? null)
      })
    } catch (error) {
      return new Response(String(error), { status: 500 })
    } finally {
      clearTimeout(keepAlive)
    }
  }
}

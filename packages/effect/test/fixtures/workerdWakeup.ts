import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import type * as Scheduler from "effect/Scheduler"
import { AsyncLocalStorage } from "node:async_hooks"

const storage = new AsyncLocalStorage<string>()
let waiter: Deferred.Deferred<void> | undefined
let childStarted = false
let suspended: { readonly fiber: Fiber.Fiber<unknown, unknown>; readonly deferred: Deferred.Deferred<void> } | undefined

const current = Effect.sync(() => storage.getStore())

// A fully synchronous custom scheduler: tasks run only when a request drains them.
const syncTasks: Array<() => void> = []
const drainSync = () => {
  while (syncTasks.length > 0) syncTasks.shift()!()
}
const syncScheduler: Scheduler.Scheduler = {
  executionMode: "sync",
  shouldYield: () => false,
  makeDispatcher: () => ({
    scheduleTask: (task) => {
      syncTasks.push(task)
    },
    flush: drainSync
  })
}

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
  // Yields and a same-tick wake under a synchronous custom scheduler, all in
  // this request: both fibers must finish before the tasks loop returns.
  "/sync-scheduler": () => {
    const tasks: Array<() => void> = []
    const scheduler: Scheduler.Scheduler = {
      executionMode: "sync",
      shouldYield: () => false,
      makeDispatcher: () => ({
        scheduleTask: (task) => {
          tasks.push(task)
        },
        flush() {}
      })
    }
    const deferred = Deferred.makeUnsafe<void>()
    const waiter = storage.run("waiter", () =>
      Effect.runFork(
        Effect.gen(function*() {
          yield* Effect.yieldNow
          yield* Deferred.await(deferred)
          yield* Effect.yieldNow
          return storage.getStore()
        }),
        { scheduler }
      ))
    const waker = storage.run(
      "waker",
      () => Effect.runFork(Effect.andThen(Effect.yieldNow, Deferred.succeed(deferred, undefined)), { scheduler })
    )
    while (tasks.length > 0) tasks.shift()!()
    const result = (fiber: Fiber.Fiber<unknown>) => {
      const exit = fiber.pollUnsafe()
      return exit === undefined ? "pending" : Exit.isSuccess(exit) ? exit.value : String(exit.cause)
    }
    return { waiter: result(waiter), waker: result(waker) }
  },
  // Parks a fiber on the synchronous scheduler until another request wakes it.
  "/sync-scheduler-wait": async () => {
    const deferred = Deferred.makeUnsafe<void>()
    const fiber = Effect.runFork(Effect.andThen(Deferred.await(deferred), current), { scheduler: syncScheduler })
    drainSync()
    suspended = { fiber, deferred }
    // Poll with a timer, so workerd does not cancel this request as hung.
    const exit = await new Promise<Exit.Exit<unknown>>((resolve) => {
      const poll = () => {
        drainSync()
        const exit = fiber.pollUnsafe()
        if (exit === undefined) setTimeout(poll, 10)
        else resolve(exit)
      }
      poll()
    })
    return Exit.isSuccess(exit) ? exit.value : String(exit.cause)
  },
  "/sync-scheduler-wake": () => {
    if (suspended === undefined) return undefined
    Deferred.doneUnsafe(suspended.deferred, Effect.void)
    drainSync()
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

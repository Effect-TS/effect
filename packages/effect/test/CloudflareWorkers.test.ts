import { assert, describe, it, vi } from "@effect/vitest"

// Models the Cloudflare Workers request lifetime rules observed in workerd:
//
// - a timer belongs to the request that set it, and never fires once that
//   request has answered
// - an AsyncLocalStorage resource created in a request's async context throws
//   when entered from another request. Resources created in the module scope
//   context are not tied to a request.
const makeWorkers = () => {
  const realSetImmediate = globalThis.setImmediate
  const timers = new Map<() => void, number>()
  const errors: Array<unknown> = []
  // the request being handled, and the request owning the async context
  let current = 0
  let frame = 0

  class AsyncResource {
    readonly request = frame
    runInAsyncScope<This, Args extends Array<unknown>, R>(
      fn: (this: This, ...args: Args) => R,
      thisArg: This,
      ...args: Args
    ): R {
      if (this.request !== 0 && this.request !== current) {
        throw new Error(
          "Cannot call this AsyncLocalStorage bound function outside of the request in which it was created."
        )
      }
      const prev = frame
      frame = this.request
      try {
        return fn.apply(thisArg, args)
      } finally {
        frame = prev
      }
    }
  }

  const install = () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" })
    vi.stubGlobal("setImmediate", (f: () => void) => {
      timers.set(f, current)
      return f
    })
    vi.stubGlobal("clearImmediate", (f: () => void) => {
      timers.delete(f)
    })
    const getBuiltinModule = process.getBuiltinModule
    vi.spyOn(process, "getBuiltinModule").mockImplementation(
      ((id: string) => id === "node:async_hooks" ? { AsyncResource } : getBuiltinModule(id)) as typeof getBuiltinModule
    )
    vi.resetModules()
  }

  const uninstall = () => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  }

  // Runs `handler` as request `id`, firing the timers it owns until it
  // answers. With `waitUntil` the request also stays open until it has no
  // pending timers left. Its remaining timers are then dropped.
  const request = async <A>(
    id: number,
    handler: () => Promise<A>,
    options?: { readonly waitUntil?: boolean }
  ): Promise<A | "hang"> => {
    current = id
    frame = id
    let result: A | "hang" = "hang"
    let done = false
    handler().then((a) => {
      result = a
      done = true
    }, (error) => {
      errors.push(error)
      done = true
    })
    const owned = () => Array.from(timers).filter(([, owner]) => owner === id).map(([f]) => f)
    const open = () => !done || (options?.waitUntil === true && owned().length > 0)
    for (let i = 0; i < 100 && open(); i++) {
      await new Promise<void>((resolve) => realSetImmediate(resolve))
      if (!open()) break
      for (const f of owned()) {
        timers.delete(f)
        try {
          f()
        } catch (error) {
          errors.push(error)
        }
      }
    }
    for (const f of owned()) timers.delete(f)
    current = 0
    frame = 0
    return result
  }

  return { install, uninstall, request, errors }
}

const importEffect = async () => ({
  Deferred: await import("effect/Deferred"),
  Effect: await import("effect/Effect"),
  Queue: await import("effect/Queue")
})

describe("Cloudflare Workers", { concurrent: false }, () => {
  it("long-lived fiber keeps serving after the request that scheduled its next turn has answered", async () => {
    const workers = makeWorkers()
    workers.install()
    try {
      const { Deferred, Effect, Queue } = await importEffect()

      // Module scope: a long-lived fiber serving jobs from a queue
      const jobs = Effect.runSync(Queue.unbounded<Deferred.Deferred<string>>())
      Effect.runFork(
        Effect.forever(Queue.take(jobs).pipe(Effect.flatMap((job) => Deferred.succeed(job, "served"))))
      )
      const serve = () =>
        Effect.runPromise(Effect.gen(function*() {
          const job = yield* Deferred.make<string>()
          yield* Queue.offer(jobs, job)
          return yield* Deferred.await(job)
        }))

      assert.strictEqual(await workers.request(1, serve), "served")
      assert.strictEqual(await workers.request(2, serve), "served")
      assert.strictEqual(await workers.request(3, serve), "served")
      assert.deepStrictEqual(workers.errors, [])
    } finally {
      workers.uninstall()
    }
  })

  it("long-lived fiber started by an earlier request can be resumed by a later request", async () => {
    const workers = makeWorkers()
    workers.install()
    try {
      const { Deferred, Effect, Queue } = await importEffect()

      // The first request starts the long-lived fiber, like a layer built on
      // the first request
      let serve!: () => Promise<string>
      const start = () => {
        const jobs = Effect.runSync(Queue.unbounded<Deferred.Deferred<string>>())
        Effect.runFork(
          Effect.forever(Queue.take(jobs).pipe(Effect.flatMap((job) => Deferred.succeed(job, "served"))))
        )
        serve = () =>
          Effect.runPromise(Effect.gen(function*() {
            const job = yield* Deferred.make<string>()
            yield* Queue.offer(jobs, job)
            return yield* Deferred.await(job)
          }))
        return serve()
      }

      // Keep each request open until its timers have fired, so only the
      // AsyncLocalStorage rule applies
      assert.strictEqual(await workers.request(1, start, { waitUntil: true }), "served")
      assert.strictEqual(await workers.request(2, () => serve(), { waitUntil: true }), "served")
      assert.deepStrictEqual(workers.errors, [])
    } finally {
      workers.uninstall()
    }
  })
})

import { assert, describe, it } from "@effect/vitest"
import { Cause, Deferred, Effect, Exit, Fiber, FiberSet, Latch, Pool, Queue, Scheduler, Scope, Semaphore } from "effect"
import { AsyncLocalStorage } from "node:async_hooks"
import { EventEmitter } from "node:events"

// A fiber woken by another fiber must resume in its own async context, not
// the waker's. See https://github.com/Effect-TS/effect/issues/8581

const storage = new AsyncLocalStorage<string>()
const current = () => storage.getStore() ?? "none"

const runWithStore = <A, E>(store: string | undefined, effect: Effect.Effect<A, E>): Promise<A> =>
  store === undefined ? Effect.runPromise(effect) : storage.run(store, () => Effect.runPromise(effect))

// Reads the store on resumption and inside async work started afterwards.
const observe = Effect.gen(function*() {
  const resumed = current()
  const promise = yield* Effect.promise(async () => current())
  const timer = yield* Effect.callback<string>((resume) => {
    setTimeout(() => resume(Effect.succeed(current())), 1)
  })
  yield* Effect.sleep(1)
  const afterSleep = current()
  return { resumed, promise, timer, afterSleep }
})

const expected = (store: string) => ({ resumed: store, promise: store, timer: store, afterSleep: store })

describe("AsyncLocalStorage", () => {
  for (const waiterStore of [undefined, "waiter"]) {
    const label = waiterStore === undefined ? "without a store" : "with its own store"

    describe(`waiter ${label}`, () => {
      it("Deferred.await resumes in the awaiter's context", async () => {
        const deferred = Deferred.makeUnsafe<void>()
        const waiter = runWithStore(waiterStore, Effect.andThen(Deferred.await(deferred), observe))
        const completer = await runWithStore(
          "waker",
          Effect.sleep(5).pipe(
            Effect.andThen(Deferred.succeed(deferred, undefined)),
            Effect.andThen(Effect.sync(current))
          )
        )
        assert.strictEqual(completer, "waker")
        assert.deepStrictEqual(await waiter, expected(waiterStore ?? "none"))
      })

      it("Pool.get resumes in the waiter's context", async () => {
        const scope = Scope.makeUnsafe()
        try {
          const pool = await Effect.runPromise(
            Pool.make({ acquire: Effect.succeed("conn"), size: 1 }).pipe(
              // Borrow once so the item is available before the holder runs.
              Effect.tap((pool) => Effect.scoped(Pool.get(pool))),
              Scope.provide(scope)
            )
          )
          const holderAcquired = Deferred.makeUnsafe<string>()
          const holder = runWithStore(
            "waker",
            Effect.scoped(
              Pool.get(pool).pipe(
                Effect.andThen(Effect.sync(current)),
                Effect.tap((store) => Deferred.succeed(holderAcquired, store)),
                Effect.andThen(Effect.sleep(10)),
                Effect.andThen(Effect.sync(current))
              )
            )
          )
          assert.strictEqual(await Effect.runPromise(Deferred.await(holderAcquired)), "waker")
          const waiter = runWithStore(waiterStore, Effect.andThen(Effect.scoped(Pool.get(pool)), observe))
          assert.strictEqual(await holder, "waker")
          assert.deepStrictEqual(await waiter, expected(waiterStore ?? "none"))
        } finally {
          await Effect.runPromise(Scope.close(scope, Exit.void))
        }
      })
    })
  }

  describe("wake-ups", () => {
    // `Effect.runFork` runs the waiter synchronously until it suspends on
    // `wait`, so the waker always runs after the waiter has suspended.
    const wakeFromAnotherContext = async (
      setup: Effect.Effect<{ readonly wait: Effect.Effect<unknown>; readonly wake: Effect.Effect<unknown> }>
    ) => {
      const { wait, wake } = Effect.runSync(setup)
      const waiter = storage.run("waiter", () => Effect.runFork(Effect.andThen(wait, observe)))
      assert.isUndefined(waiter.pollUnsafe())
      const waker = await runWithStore("waker", Effect.andThen(wake, Effect.sync(current)))
      assert.strictEqual(waker, "waker")
      assert.deepStrictEqual(await Effect.runPromise(Fiber.join(waiter)), expected("waiter"))
    }

    it("Latch.await", () =>
      wakeFromAnotherContext(Effect.sync(() => {
        const latch = Latch.makeUnsafe(false)
        return { wait: latch.await, wake: latch.open }
      })))

    it("Semaphore.take", () =>
      wakeFromAnotherContext(Effect.gen(function*() {
        const semaphore = Semaphore.makeUnsafe(1)
        yield* semaphore.take(1)
        return { wait: semaphore.take(1), wake: semaphore.release(1) }
      })))

    it("Queue.take", () =>
      wakeFromAnotherContext(Effect.gen(function*() {
        const queue = yield* Queue.unbounded<number>()
        return { wait: Queue.take(queue), wake: Queue.offer(queue, 1) }
      })))

    it("Fiber.join", () =>
      wakeFromAnotherContext(Effect.sync(() => {
        const deferred = Deferred.makeUnsafe<void>()
        const fiber = Effect.runFork(Deferred.await(deferred))
        return { wait: Fiber.join(fiber), wake: Deferred.succeed(deferred, undefined) }
      })))

    it("Effect.all parent", () =>
      wakeFromAnotherContext(Effect.sync(() => {
        const first = Deferred.makeUnsafe<void>()
        const second = Deferred.makeUnsafe<void>()
        return {
          wait: Effect.all([Deferred.await(first), Deferred.await(second)], { concurrency: "unbounded" }),
          wake: Effect.andThen(Deferred.succeed(first, undefined), Deferred.succeed(second, undefined))
        }
      })))
  })

  describe("interruption", () => {
    // Suspends forever and records the store seen by its interrupt handlers.
    const interruptible = () => {
      const seen: Record<string, string> = {}
      let onSuspended!: () => void
      const suspended = new Promise<void>((resolve) => {
        onSuspended = resolve
      })
      const program = Effect.callback<never>(() => {
        onSuspended()
      }).pipe(
        Effect.onInterrupt(() =>
          Effect.sync(() => {
            seen.onInterrupt = current()
          })
        ),
        Effect.ensuring(Effect.gen(function*() {
          seen.finalizer = current()
          seen.finalizerPromise = yield* Effect.promise(async () => current())
          yield* Effect.sleep(1)
          seen.finalizerAfterSleep = current()
        }))
      )
      const fiber = storage.run("waiter", () => Effect.runFork(program))
      return { fiber, seen, suspended }
    }
    const expectedSeen = {
      onInterrupt: "waiter",
      finalizer: "waiter",
      finalizerPromise: "waiter",
      finalizerAfterSleep: "waiter"
    }

    it("Fiber.interrupt from another context runs handlers in the fiber's context", async () => {
      const { fiber, seen, suspended } = interruptible()
      await suspended
      const interrupter = await runWithStore(
        "interrupter",
        Effect.andThen(Fiber.interrupt(fiber), Effect.sync(current))
      )
      assert.strictEqual(interrupter, "interrupter")
      assert.deepStrictEqual(seen, expectedSeen)
    })

    it("interruptUnsafe from another context runs handlers in the fiber's context", async () => {
      const { fiber, seen, suspended } = interruptible()
      await suspended
      const interrupter = storage.run("interrupter", () => {
        fiber.interruptUnsafe()
        return current()
      })
      assert.strictEqual(interrupter, "interrupter")
      assert.isTrue(Exit.hasInterrupts(await Effect.runPromise(Fiber.await(fiber))))
      assert.deepStrictEqual(seen, expectedSeen)
    })
  })

  describe("promises", () => {
    interface Source {
      readonly promise: PromiseLike<number>
      readonly settle: (outcome: "fulfill" | "reject") => void
    }

    // Each source settles by calling the fiber's callbacks from the caller's
    // context.
    const sources: Record<string, () => Source> = {
      "native Promise": () => {
        let resolve!: (n: number) => void
        let reject!: (e: unknown) => void
        const promise = new Promise<number>((res, rej) => {
          resolve = res
          reject = rej
        })
        return { promise, settle: (outcome) => outcome === "fulfill" ? resolve(1) : reject("boom") }
      },
      "custom thenable": () => {
        let callbacks!: [(n: number) => void, (e: unknown) => void]
        const promise: PromiseLike<number> = {
          // oxlint-disable-next-line unicorn/no-thenable -- the thenable under test
          then: ((onFulfilled: any, onRejected: any) => {
            callbacks = [onFulfilled, onRejected]
          }) as any
        }
        return { promise, settle: (outcome) => outcome === "fulfill" ? callbacks[0](1) : callbacks[1]("boom") }
      },
      "Promise subclass overriding then": () => {
        let callbacks!: [(n: number) => void, (e: unknown) => void]
        class SavedCallbacks<A> extends Promise<A> {
          // oxlint-disable-next-line unicorn/no-thenable -- the override under test
          override then(onFulfilled: any, onRejected: any): any {
            callbacks = [onFulfilled, onRejected]
            return this
          }
        }
        const promise = new SavedCallbacks<number>(() => {})
        return { promise, settle: (outcome) => outcome === "fulfill" ? callbacks[0](1) : callbacks[1]("boom") }
      },
      "Promise with an own then": () => {
        let callbacks!: [(n: number) => void, (e: unknown) => void]
        const promise = new Promise<number>(() => {})
        // oxlint-disable-next-line unicorn/no-thenable -- the own `then` under test
        Object.defineProperty(promise, "then", {
          value: (onFulfilled: any, onRejected: any) => {
            callbacks = [onFulfilled, onRejected]
          }
        })
        return { promise, settle: (outcome) => outcome === "fulfill" ? callbacks[0](1) : callbacks[1]("boom") }
      },
      "Promise whose then getter changes": () => {
        // The first read returns the built-in `then`, later reads return a
        // method that saves the callbacks
        let callbacks: [(n: number) => void, (e: unknown) => void] | undefined
        let resolve!: (n: number) => void
        let reject!: (e: unknown) => void
        const promise = new Promise<number>((res, rej) => {
          resolve = res
          reject = rej
        })
        let reads = 0
        // oxlint-disable-next-line unicorn/no-thenable -- the getter under test
        Object.defineProperty(promise, "then", {
          get: () =>
            reads++ === 0 ? Promise.prototype.then : (onFulfilled: any, onRejected: any) => {
              callbacks = [onFulfilled, onRejected]
            }
        })
        const settle = (outcome: "fulfill" | "reject") => {
          if (callbacks !== undefined) {
            if (outcome === "fulfill") callbacks[0](1)
            else callbacks[1]("boom")
          } else if (outcome === "fulfill") {
            resolve(1)
          } else {
            reject("boom")
          }
        }
        return { promise, settle }
      }
    }

    const apis: Record<string, (promise: PromiseLike<number>) => Effect.Effect<number, unknown>> = {
      "Effect.promise": (promise) => Effect.promise(() => promise),
      "Effect.tryPromise": (promise) => Effect.tryPromise({ try: () => promise, catch: (e) => e })
    }

    for (const [sourceName, makeSource] of Object.entries(sources)) {
      for (const [apiName, api] of Object.entries(apis)) {
        for (const outcome of ["fulfill", "reject"] as const) {
          it(`${apiName} resumes in the fiber's context when a ${sourceName} settles (${outcome})`, async () => {
            const source = makeSource()
            // The promise API registers its callbacks before the fiber suspends
            const fiber = storage.run(
              "waiter",
              () => Effect.runFork(Effect.andThen(Effect.exit(api(source.promise)), observe))
            )
            assert.isUndefined(fiber.pollUnsafe())
            storage.run("waker", () => source.settle(outcome))
            assert.deepStrictEqual(await Effect.runPromise(Fiber.join(fiber)), expected("waiter"))
          })
        }
      }
    }

    // The catcher is part of the fiber's resumption, so it and any async work
    // it starts must see the fiber's store, even when it throws.
    describe("Effect.tryPromise catcher", () => {
      const catcherError = new Error("catcher failed")

      const runCatcher = async (
        promise: () => PromiseLike<number>,
        settle: (() => void) | undefined,
        throws: boolean
      ) => {
        let catcherStore: string | undefined
        let catcherWork: Promise<Array<string>> | undefined
        const catcher = (cause: unknown) => {
          catcherStore = current()
          catcherWork = Promise.all([
            Promise.resolve().then(current),
            new Promise<string>((resolve) => setTimeout(() => resolve(current()), 1))
          ])
          if (throws) throw catcherError
          return cause
        }
        const fiber = storage.run("waiter", () =>
          Effect.runFork(Effect.gen(function*() {
            const exit = yield* Effect.exit(Effect.tryPromise({ try: promise, catch: catcher }))
            return { exit, after: yield* observe }
          })))
        if (settle !== undefined) {
          assert.isUndefined(fiber.pollUnsafe())
          storage.run("waker", settle)
        }
        const { exit, after } = await Effect.runPromise(Fiber.join(fiber))
        assert.deepStrictEqual(
          { catcher: catcherStore, catcherWork: await catcherWork },
          { catcher: "waiter", catcherWork: ["waiter", "waiter"] }
        )
        if (throws) {
          assert.isTrue(Exit.hasDies(exit))
        } else {
          assert.isTrue(Exit.hasFails(exit))
        }
        assert.strictEqual(Exit.isFailure(exit) && Cause.squash(exit.cause), throws ? catcherError : "boom")
        assert.deepStrictEqual(after, expected("waiter"))
      }

      for (const throws of [false, true]) {
        const label = throws ? "a throwing catcher" : "the catcher"

        for (const [sourceName, makeSource] of Object.entries(sources)) {
          it(`${label} runs in the fiber's context when a ${sourceName} rejects`, () => {
            const source = makeSource()
            return runCatcher(() => source.promise, () => source.settle("reject"), throws)
          })
        }

        it(`${label} runs in the fiber's context when try throws synchronously`, () =>
          runCatcher(
            () => {
              throw "boom"
            },
            undefined,
            throws
          ))
      }
    })
  })

  describe("forks", () => {
    // Waits on a Deferred completed from the "waker" context, then observes.
    const wokenFromWaker = (deferred: Deferred.Deferred<void>) => Effect.andThen(Deferred.await(deferred), observe)
    const wake = (deferred: Deferred.Deferred<void>) =>
      storage.run("waker", () => Deferred.doneUnsafe(deferred, Exit.void))

    for (const startImmediately of [false, true]) {
      for (const parentSuspendedFirst of [false, true]) {
        const label = `${startImmediately ? "immediate" : "scheduled"} child, parent ${
          parentSuspendedFirst ? "already" : "not yet"
        } suspended`

        it(`forkChild shares the parent's context (${label})`, async () => {
          const childGate = Deferred.makeUnsafe<void>()
          const parentGate = Deferred.makeUnsafe<void>()
          const parent = storage.run("parent", () =>
            Effect.runFork(Effect.gen(function*() {
              if (parentSuspendedFirst) yield* Effect.yieldNow
              const child = yield* Effect.forkChild(
                Effect.sync(current).pipe(
                  Effect.flatMap((started) => Effect.map(wokenFromWaker(childGate), (after) => ({ started, after })))
                ),
                { startImmediately }
              )
              const afterFork = current()
              const parentAfter = yield* wokenFromWaker(parentGate)
              return { afterFork, parentAfter, child: yield* Fiber.join(child) }
            })))
          await Effect.runPromise(Effect.yieldNow)
          wake(childGate)
          wake(parentGate)
          assert.deepStrictEqual(await Effect.runPromise(Fiber.join(parent)), {
            afterFork: "parent",
            parentAfter: expected("parent"),
            child: { started: "parent", after: expected("parent") }
          })
        })

        it(`a fiber forked inside a nested storage.run keeps the nested context (${label})`, async () => {
          const childGate = Deferred.makeUnsafe<void>()
          const parentGate = Deferred.makeUnsafe<void>()
          const parent = storage.run("parent", () =>
            Effect.runFork(Effect.gen(function*() {
              if (parentSuspendedFirst) yield* Effect.yieldNow
              // A fiber started inside a nested run from the parent's stack
              const child = yield* Effect.sync(() =>
                storage.run("nested", () =>
                  Effect.runFork(Effect.gen(function*() {
                    const inner = yield* Effect.forkChild(
                      Effect.sync(current).pipe(
                        Effect.flatMap((started) =>
                          Effect.map(wokenFromWaker(childGate), (after) => ({ started, after }))
                        )
                      ),
                      { startImmediately }
                    )
                    return yield* Fiber.join(inner)
                  })))
              )
              const afterNestedRun = current()
              const parentAfter = yield* wokenFromWaker(parentGate)
              return { afterNestedRun, parentAfter, child: yield* Fiber.join(child) }
            })))
          await Effect.runPromise(Effect.yieldNow)
          wake(childGate)
          wake(parentGate)
          assert.deepStrictEqual(await Effect.runPromise(Fiber.join(parent)), {
            afterNestedRun: "parent",
            parentAfter: expected("parent"),
            child: { started: "nested", after: expected("nested") }
          })
        })
      }
    }

    it("FiberSet.runtime forks in the caller's context, not the context that created the runtime", async () => {
      const scope = Scope.makeUnsafe()
      try {
        const run = await runWithStore(
          "runtime",
          Effect.gen(function*() {
            const set = yield* FiberSet.make<unknown>()
            return yield* FiberSet.runtime(set)<never>()
          }).pipe(Scope.provide(scope))
        )
        const gate = Deferred.makeUnsafe<void>()
        const fiber = storage.run("caller", () =>
          run(
            Effect.sync(current).pipe(
              Effect.flatMap((started) => Effect.map(wokenFromWaker(gate), (after) => ({ started, after })))
            )
          ))
        await Effect.runPromise(Effect.yieldNow)
        wake(gate)
        assert.deepStrictEqual(await Effect.runPromise(Fiber.join(fiber)), {
          started: "caller",
          after: expected("caller")
        })
      } finally {
        await Effect.runPromise(Scope.close(scope, Exit.void))
      }
    })

    it("a child start and yield scheduled on a dispatcher armed by another context", async () => {
      const gate = Deferred.makeUnsafe<void>()
      const parent = storage.run("parent", () =>
        Effect.runFork(Effect.gen(function*() {
          yield* Deferred.await(gate)
          const child = yield* Effect.forkChild(Effect.sync(current))
          yield* Effect.yieldNow
          const afterYield = current()
          return { afterYield, child: yield* Fiber.join(child) }
        })))
      assert.isUndefined(parent.pollUnsafe())
      storage.run("foreign", () => {
        // Arms the parent's idle dispatcher from this context, then wakes the
        // parent so its child start and yield join the same batch
        parent.currentDispatcher.scheduleTask(() => {}, 0)
        Deferred.doneUnsafe(gate, Exit.void)
      })
      assert.deepStrictEqual(await Effect.runPromise(Fiber.join(parent)), {
        afterYield: "parent",
        child: "parent"
      })
    })
  })

  // Policy: like `await`, a fiber resumes in the async context it had when it
  // suspended, so a store set with `enterWith` survives every kind of resume.
  describe("enterWith", () => {
    interface Boundary {
      readonly effect: Effect.Effect<unknown, unknown>
      // Resumes the fiber from the "waker" context once it has suspended
      readonly settle?: () => void
      readonly result?: unknown
    }

    const boundaries: Record<string, () => Boundary> = {
      "native Effect.promise (fulfilled)": () => ({ effect: Effect.promise(() => Promise.resolve(1)) }),
      "native Effect.promise (rejected)": () => ({ effect: Effect.exit(Effect.promise(() => Promise.reject("boom"))) }),
      "native Effect.tryPromise (fulfilled)": () => ({
        effect: Effect.tryPromise({ try: () => Promise.resolve(1), catch: (e) => e })
      }),
      "native Effect.tryPromise (rejected)": () => ({
        effect: Effect.exit(Effect.tryPromise({ try: () => Promise.reject("boom"), catch: (e) => e }))
      }),
      "native promise settled from another context": () => {
        let resolve!: (n: number) => void
        const promise = new Promise<number>((res) => {
          resolve = res
        })
        return { effect: Effect.promise(() => promise), settle: () => resolve(1) }
      },
      "custom thenable settled from another context": () => {
        let onFulfilled!: (n: number) => void
        const promise: PromiseLike<number> = {
          // oxlint-disable-next-line unicorn/no-thenable -- the thenable under test
          then: ((f: any) => {
            onFulfilled = f
          }) as any
        }
        return { effect: Effect.promise(() => promise), settle: () => onFulfilled(1) }
      },
      "Deferred completed from another context": () => {
        const deferred = Deferred.makeUnsafe<void>()
        return { effect: Deferred.await(deferred), settle: () => Deferred.doneUnsafe(deferred, Exit.void) }
      },
      "Effect.callback resumed from another context": () => {
        let resume!: (effect: Effect.Effect<void>) => void
        return {
          effect: Effect.callback<void>((r) => {
            resume = r
          }),
          settle: () => resume(Effect.void)
        }
      },
      "Effect.yieldNow": () => ({ effect: Effect.yieldNow }),
      "Effect.sleep": () => ({ effect: Effect.sleep(1) }),
      "Effect.forkChild": () => ({
        effect: Effect.forkChild(
          Effect.sync(current).pipe(
            Effect.flatMap((started) =>
              Effect.map(Effect.andThen(Effect.yieldNow, observe), (after) => ({ started, after }))
            )
          )
        ).pipe(Effect.flatMap(Fiber.join)),
        result: { started: "b", after: expected("b") }
      })
    }

    for (const when of ["before", "after"] as const) {
      for (const [name, makeBoundary] of Object.entries(boundaries)) {
        it(`${name} keeps a store set ${when} the first suspension`, async () => {
          const boundary = makeBoundary()
          let onReady!: () => void
          const ready = new Promise<void>((resolve) => {
            onReady = resolve
          })
          const fiber = storage.run("a", () =>
            Effect.runFork(Effect.gen(function*() {
              if (when === "after") yield* Effect.yieldNow
              yield* Effect.sync(() => storage.enterWith("b"))
              // Reactions run after the fiber has suspended at the boundary
              yield* Effect.sync(onReady)
              const result = yield* boundary.effect
              return { result, after: yield* observe }
            })))
          await ready
          if (boundary.settle !== undefined) {
            const waker = storage.run("waker", () => {
              boundary.settle!()
              return current()
            })
            assert.strictEqual(waker, "waker")
          }
          const { result, after } = await Effect.runPromise(Fiber.join(fiber))
          assert.strictEqual(after.resumed, "b", "store right after the boundary")
          assert.deepStrictEqual(after, expected("b"))
          if (boundary.result !== undefined) {
            assert.deepStrictEqual(result, boundary.result)
          }
        })
      }

      it(`interrupt handlers see a store set ${when} the first suspension`, async () => {
        const seen: Record<string, string> = {}
        let onReady!: () => void
        const ready = new Promise<void>((resolve) => {
          onReady = resolve
        })
        const fiber = storage.run("a", () =>
          Effect.runFork(
            Effect.gen(function*() {
              if (when === "after") yield* Effect.yieldNow
              yield* Effect.sync(() => storage.enterWith("b"))
              yield* Effect.sync(onReady)
              return yield* Effect.never
            }).pipe(
              Effect.onInterrupt(() =>
                Effect.sync(() => {
                  seen.onInterrupt = current()
                })
              ),
              Effect.ensuring(Effect.gen(function*() {
                seen.finalizer = current()
                seen.finalizerPromise = yield* Effect.promise(async () => current())
                yield* Effect.sleep(1)
                seen.finalizerAfterSleep = current()
              }))
            )
          ))
        await ready
        const interrupter = storage.run("interrupter", () => {
          fiber.interruptUnsafe()
          return current()
        })
        assert.strictEqual(interrupter, "interrupter")
        await Effect.runPromise(Fiber.await(fiber))
        assert.deepStrictEqual(seen, {
          onInterrupt: "b",
          finalizer: "b",
          finalizerPromise: "b",
          finalizerAfterSleep: "b"
        })
      })

      it(`a store set ${when} the first suspension does not leak into a fiber it wakes`, async () => {
        const deferred = Deferred.makeUnsafe<void>()
        const waiter = storage.run("waiter", () => Effect.runFork(Effect.andThen(Deferred.await(deferred), observe)))
        const waker = storage.run("a", () =>
          Effect.runFork(Effect.gen(function*() {
            if (when === "after") yield* Effect.yieldNow
            yield* Effect.sync(() => storage.enterWith("b"))
            yield* Deferred.succeed(deferred, undefined)
            return current()
          })))
        assert.strictEqual(await Effect.runPromise(Fiber.join(waker)), "b")
        assert.deepStrictEqual(await Effect.runPromise(Fiber.join(waiter)), expected("waiter"))
      })
    }
  })

  // A wake that reaches a fiber after it has already been interrupted, but
  // before the interrupt has run, must not run the continuation, and must not
  // run it on the waker's stack.
  describe("interrupt before resume", () => {
    it("a resume arriving after interruptUnsafe does not run the continuation", async () => {
      let resume!: (effect: Effect.Effect<number>) => void
      const seen: Record<string, string> = {}
      const fiber = storage.run("waiter", () =>
        Effect.runFork(
          Effect.callback<number>((r) => {
            resume = r
          }).pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                seen.continuation = current()
              })
            ),
            Effect.onInterrupt(() =>
              Effect.sync(() => {
                seen.onInterrupt = current()
              })
            )
          )
        ))
      storage.run("interrupter", () => fiber.interruptUnsafe())
      storage.run("waker", () => resume(Effect.succeed(1)))
      const exit = await Effect.runPromise(Fiber.await(fiber))
      assert.isTrue(Exit.hasInterrupts(exit))
      assert.deepStrictEqual(seen, { onInterrupt: "waiter" })
    })

    it("a queued yield task running after interruptUnsafe does not run the continuation", async () => {
      // A scheduler whose tasks run only when the test runs them, so the
      // yield task can be run from another context before any microtask.
      const tasks: Array<() => void> = []
      const scheduler: Scheduler.Scheduler = {
        executionMode: "async",
        shouldYield: () => false,
        makeDispatcher: () => ({
          scheduleTask: (task) => {
            tasks.push(task)
          },
          flush: () => {
            while (tasks.length > 0) tasks.shift()!()
          }
        })
      }
      const seen: Record<string, string> = {}
      const fiber = storage.run("waiter", () =>
        Effect.runFork(
          Effect.yieldNow.pipe(
            Effect.tap(() =>
              Effect.sync(() => {
                seen.continuation = current()
              })
            ),
            Effect.onInterrupt(() =>
              Effect.sync(() => {
                seen.onInterrupt = current()
              })
            )
          ),
          { scheduler }
        ))
      assert.strictEqual(tasks.length, 1)
      storage.run("interrupter", () => fiber.interruptUnsafe())
      storage.run("waker", () => {
        while (tasks.length > 0) tasks.shift()!()
      })
      const exit = await Effect.runPromise(Fiber.await(fiber))
      assert.isTrue(Exit.hasInterrupts(exit))
      assert.deepStrictEqual(seen, { onInterrupt: "waiter" })
    })
  })

  // Synchronous schedulers are not exempt: `storage.run` nests on a single
  // stack, and the public sync scheduler can be used with `runFork`.
  describe("sync scheduler", () => {
    it("a child woken inside a nested storage.run during runSync keeps its own context", () => {
      const seen = storage.run("waiter", () =>
        Effect.runSync(Effect.gen(function*() {
          const deferred = Deferred.makeUnsafe<void>()
          const child = yield* Effect.forkChild(Effect.andThen(Deferred.await(deferred), Effect.sync(current)), {
            startImmediately: true
          })
          yield* Effect.sync(() => storage.run("waker", () => Deferred.doneUnsafe(deferred, Exit.void)))
          return yield* Fiber.join(child)
        })))
      assert.strictEqual(seen, "waiter")
    })

    it("MixedScheduler(\"sync\") with runFork resumes in the waiter's context", async () => {
      const scheduler = new Scheduler.MixedScheduler("sync")
      const deferred = Deferred.makeUnsafe<void>()
      const waiter = storage.run("waiter", () =>
        Effect.runFork(
          Effect.andThen(
            Deferred.await(deferred),
            Effect.map(Effect.promise(async () => current()), (promise) => ({ resumed: current(), promise }))
          ),
          { scheduler }
        ))
      assert.isUndefined(waiter.pollUnsafe())
      storage.run("waker", () => Deferred.doneUnsafe(deferred, Exit.void))
      assert.deepStrictEqual(await Effect.runPromise(Fiber.join(waiter)), { resumed: "waiter", promise: "waiter" })
    })
  })

  // A host listener registered by the fiber runs in whatever context fires
  // it; that is the host's rule. The Effect continuation after `resume` is
  // the fiber's own.
  describe("host callbacks", () => {
    it("an EventEmitter listener fired from another context resumes the fiber in its own context", async () => {
      const emitter = new EventEmitter()
      const fiber = storage.run("waiter", () =>
        Effect.runFork(
          Effect.callback<void>((resume) => {
            emitter.once("wake", () => resume(Effect.void))
          }).pipe(Effect.andThen(observe))
        ))
      assert.isUndefined(fiber.pollUnsafe())
      storage.run("waker", () => emitter.emit("wake"))
      assert.deepStrictEqual(await Effect.runPromise(Fiber.join(fiber)), expected("waiter"))
    })
  })
})

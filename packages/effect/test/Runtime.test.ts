import { AsyncLocalStorage } from "node:async_hooks"

import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual, throwsAsync } from "@effect/vitest/utils"
import { Effect, Exit, FiberRef, Layer, pipe, Runtime } from "effect"

describe("Runtime", () => {
  it.effect("setFiberRef", () =>
    Effect.gen(function*() {
      const ref = FiberRef.unsafeMake(0)
      const runtime = Runtime.defaultRuntime.pipe(
        Runtime.setFiberRef(ref, 1)
      )
      let result = Runtime.runSync(runtime)(FiberRef.get(ref))
      strictEqual(result, 1)

      result = yield* pipe(FiberRef.get(ref), Effect.provide(runtime))
      strictEqual(result, 1)
    }))

  it.scoped("deleteFiberRef", () =>
    Effect.gen(function*() {
      const ref = FiberRef.unsafeMake({ value: 0 })
      const runtime = yield* (Layer.toRuntime(Layer.effectDiscard(FiberRef.set(ref, { value: 1 }))))

      let result = Runtime.runSync(runtime)(FiberRef.get(ref))
      deepStrictEqual(result, { value: 1 })

      result = Runtime.runSync(Runtime.deleteFiberRef(runtime, ref))(FiberRef.get(ref))
      deepStrictEqual(result, { value: 0 })
    }))

  it("runSync", () => {
    deepStrictEqual(Runtime.runSync(Runtime.defaultRuntime)(Effect.succeed(1)), 1)
    deepStrictEqual(Runtime.runSync(Runtime.defaultRuntime, Effect.succeed(1)), 1)
  })

  it("runSyncExit", () => {
    deepStrictEqual(Runtime.runSyncExit(Runtime.defaultRuntime)(Effect.succeed(1)), Exit.succeed(1))
    deepStrictEqual(Runtime.runSyncExit(Runtime.defaultRuntime, Effect.succeed(1)), Exit.succeed(1))

    deepStrictEqual(Runtime.runSyncExit(Runtime.defaultRuntime)(Effect.fail(1)), Exit.fail(1))
    deepStrictEqual(Runtime.runSyncExit(Runtime.defaultRuntime, Effect.fail(1)), Exit.fail(1))
  })

  it("runPromise", async () => {
    deepStrictEqual(
      await Runtime.runPromise(Runtime.defaultRuntime)(Effect.promise(async () => 1)),
      1
    )
    throwsAsync(
      async () => {
        await Runtime.runPromise(Runtime.defaultRuntime)(
          Effect.tryPromise({ try: () => new Promise((_, reject) => reject(1)), catch: () => "error" })
        )
      }
    )

    deepStrictEqual(
      await Runtime.runPromise(Runtime.defaultRuntime, Effect.promise(async () => 1)),
      1
    )
    throwsAsync(
      async () => {
        await Runtime.runPromise(
          Runtime.defaultRuntime,
          Effect.tryPromise({ try: () => new Promise((_, reject) => reject(1)), catch: () => "error" })
        )
      }
    )
  })

  it.effect("runPromise isolates AsyncLocalStorage across concurrent calls", () =>
    Effect.gen(function*() {
      type RequestStore = {
        readonly userId: string
      }

      type Result = {
        readonly expected: string
        readonly observed: string
      }

      const requestStore = new AsyncLocalStorage<RequestStore>()

      const readAlsOnScheduledContinuation = Effect.withFiberRuntime<Result>((fiber) =>
        Effect.sync(() => requestStore.getStore()?.userId ?? "NONE").pipe(
          Effect.flatMap((expected) =>
            Effect.async<Result>((resume) => {
              fiber.currentScheduler.scheduleTask(
                () => {
                  resume(
                    Effect.succeed({
                      expected,
                      observed: requestStore.getStore()?.userId ?? "NONE"
                    })
                  )
                },
                0,
                fiber
              )
            })
          )
        )
      )

      const runtime = yield* Effect.runtime<never>()

      const runRequest = (userId: string): Promise<Result> =>
        requestStore.run(
          { userId },
          () => Runtime.runPromise(runtime)(readAlsOnScheduledContinuation)
        )

      const results = yield* Effect.promise(() =>
        Promise.all([
          runRequest("user-A"),
          runRequest("user-B")
        ])
      )

      deepStrictEqual(results, [
        { expected: "user-A", observed: "user-A" },
        { expected: "user-B", observed: "user-B" }
      ])
    }))

  it("runPromiseExit", async () => {
    deepStrictEqual(
      await Runtime.runPromiseExit(Runtime.defaultRuntime)(Effect.promise(async () => 1)),
      Exit.succeed(1)
    )
    deepStrictEqual(
      await Runtime.runPromiseExit(Runtime.defaultRuntime)(
        Effect.tryPromise({ try: () => new Promise((_, reject) => reject(1)), catch: () => "error" })
      ),
      Exit.fail("error")
    )

    deepStrictEqual(
      await Runtime.runPromiseExit(Runtime.defaultRuntime, Effect.promise(async () => 1)),
      Exit.succeed(1)
    )
    deepStrictEqual(
      await Runtime.runPromiseExit(
        Runtime.defaultRuntime,
        Effect.tryPromise({ try: () => new Promise((_, reject) => reject(1)), catch: () => "error" })
      ),
      Exit.fail("error")
    )
  })

  it("runPromiseExit/signal", async () => {
    const aborted = AbortSignal.abort()
    assertTrue(
      Exit.isInterrupted(await Runtime.runPromiseExit(Runtime.defaultRuntime)(Effect.never, { signal: aborted }))
    )
    assertTrue(
      Exit.isInterrupted(await Runtime.runPromiseExit(Runtime.defaultRuntime, Effect.never, { signal: aborted }))
    )

    const controller = new AbortController()
    setTimeout(() => controller.abort(), 10)
    assertTrue(
      Exit.isInterrupted(
        await Runtime.runPromiseExit(Runtime.defaultRuntime)(Effect.never, { signal: controller.signal })
      )
    )
    assertTrue(
      Exit.isInterrupted(
        await Runtime.runPromiseExit(Runtime.defaultRuntime, Effect.never, { signal: controller.signal })
      )
    )
  })
})

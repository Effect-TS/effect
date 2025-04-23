import { describe, it } from "@effect/vitest"
import { assertLeft, assertSuccess, assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Cause, Effect, Option } from "effect"

describe("Effect", () => {
  it("tryPromise - success, no catch, no AbortSignal", async () => {
    const effect = Effect.tryPromise<number>(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(1)
        }, 100)
      })
    )
    const n = await Effect.runPromise(effect)
    strictEqual(n, 1)
  })

  it("tryPromise - failure, no catch, no AbortSignal", async () => {
    const effect = Effect.tryPromise<void>(() =>
      new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject("error")
        }, 100)
      })
    )
    const either = await Effect.runPromise(Effect.either(effect))
    assertLeft(either, new Cause.UnknownException("error", "An unknown error occurred in Effect.tryPromise"))
  })

  it("tryPromise - failure, catch, no AbortSignal", async () => {
    const effect = Effect.tryPromise({
      try: () =>
        new Promise((_resolve, reject) => {
          setTimeout(() => {
            reject("error")
          }, 100)
        }),
      catch: (error) => new Error(String(error))
    })
    const either = await Effect.runPromise(Effect.either(effect))
    assertLeft(either, new Error("error"))
  })

  it("tryPromise - success, no catch, AbortSignal", async () => {
    let aborted = false
    const effect = Effect.tryPromise<void>((signal) => {
      signal.addEventListener("abort", () => {
        aborted = true
      }, { once: true })
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, 100)
      })
    })
    const program = effect.pipe(
      Effect.timeout("10 millis"),
      Effect.asSome,
      Effect.catchTag("TimeoutException", () => Effect.succeedNone)
    )
    const exit = await Effect.runPromiseExit(program)
    assertSuccess(exit, Option.none())
    assertTrue(aborted)
  })

  it("tryPromise - success, catch, AbortSignal", async () => {
    let aborted = false
    const effect = Effect.tryPromise<void, Error>({
      try: (signal) => {
        signal.addEventListener("abort", () => {
          aborted = true
        }, { once: true })
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve()
          }, 100)
        })
      },
      catch: () => new Error()
    })
    const program = effect.pipe(
      Effect.timeout("10 millis"),
      Effect.asSome,
      Effect.catchTag("TimeoutException", () => Effect.succeedNone)
    )
    const exit = await Effect.runPromiseExit(program)
    assertSuccess(exit, Option.none())
    assertTrue(aborted)
  })

  it.effect("tryPromise - defects in catch", () =>
    Effect.gen(function*() {
      const cause = yield* Effect.tryPromise({
        try: () => Promise.reject("error"),
        catch: (error) => {
          throw new Error(String(error))
        }
      }).pipe(
        Effect.sandbox,
        Effect.flip
      )
      deepStrictEqual(cause, Cause.die(new Error("error")))
    }))
})

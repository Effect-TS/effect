import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import { describe, expect, it } from "effect/test/utils/extend"

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
    expect(n).toBe(1)
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
    expect(either).toStrictEqual(Either.left(new Cause.UnknownException("error")))
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
    expect(either).toStrictEqual(Either.left(new Error("error")))
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
    expect(exit._tag).toBe("Success")
    expect(aborted).toBe(true)
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
    expect(exit._tag).toBe("Success")
    expect(aborted).toBe(true)
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
      expect(cause).toStrictEqual(Cause.die(new Error("error")))
    }))
})

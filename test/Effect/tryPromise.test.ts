import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as timeout from "effect/internal/timeout"
import { describe, expect, it } from "vitest"

describe.concurrent("Effect", () => {
  it("tryPromise - sync fail", async () => {
    const effect = Effect.tryPromise({
      try: () => {
        throw "fail"
        return Promise.resolve("hello")
      },
      catch: (e) => `caught: ${e}`
    })
    const either = await Effect.runPromise(Effect.either(effect))
    expect(either).toStrictEqual(Either.left("caught: fail"))
  })

  it("tryPromise - failure, no catch, no AbortSignal", async () => {
    const effect = Effect.tryPromise<void>(() =>
      new Promise((_resolve, reject) => {
        timeout.set(() => {
          reject("error")
        }, 100)
      })
    )
    const either = await Effect.runPromise(Effect.either(effect))
    expect(either).toStrictEqual(Either.left(new Cause.UnknownException("error")))
  })

  it("tryPromise - failure, no catch, AbortSignal", async () => {
    let aborted = false
    const effect = Effect.tryPromise<void>((signal) => {
      signal.addEventListener("abort", () => {
        aborted = true
      })
      return new Promise((_resolve, reject) => {
        timeout.set(() => {
          reject("error")
        }, 50)
      })
    })
    const program = effect.pipe(
      Effect.timeout("100 millis")
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Failure")
    expect(aborted).toBe(false)
  })

  it("tryPromise - failure, catch, no AbortSignal", async () => {
    const effect = Effect.tryPromise({
      try: () =>
        new Promise((_resolve, reject) => {
          timeout.set(() => {
            reject("error")
          }, 100)
        }),
      catch: (error) => new Error(String(error))
    })
    const either = await Effect.runPromise(Effect.either(effect))
    expect(either).toStrictEqual(Either.left(new Error("error")))
  })

  it("tryPromise - failure, catch, AbortSignal", async () => {
    let aborted = false
    const effect = Effect.tryPromise<void, Error>({
      try: (signal) => {
        signal.addEventListener("abort", () => {
          aborted = true
        })
        return new Promise((_resolve, reject) => {
          timeout.set(() => {
            reject("error")
          }, 50)
        })
      },
      catch: () => new Error()
    })
    const program = effect.pipe(
      Effect.timeout("100 millis")
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Failure")
    expect(aborted).toBe(false)
  })

  it("tryPromise - success, no catch, no AbortSignal", async () => {
    const effect = Effect.tryPromise<number>(() =>
      new Promise((resolve) => {
        timeout.set(() => {
          resolve(1)
        }, 100)
      })
    )
    const n = await Effect.runPromise(effect)
    expect(n).toBe(1)
  })

  it("tryPromise - success, no catch, AbortSignal", async () => {
    let aborted = false
    const effect = Effect.tryPromise<void>((signal) => {
      signal.addEventListener("abort", () => {
        aborted = true
      })
      return new Promise((resolve) => {
        timeout.set(() => {
          resolve()
        }, 100)
      })
    })
    const program = effect.pipe(
      Effect.timeout("10 millis")
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Success")
    expect(aborted).toBe(true)
  })

  it("tryPromise - success, catch, no AbortSignal", async () => {
    const effect = Effect.tryPromise<number, Error>({
      try: () => {
        return new Promise((resolve) => {
          timeout.set(() => {
            resolve(1)
          }, 100)
        })
      },
      catch: () => new Error()
    })

    const n = await Effect.runPromise(effect)
    expect(n).toBe(1)
  })

  it("tryPromise - success, catch, AbortSignal", async () => {
    let aborted = false
    const effect = Effect.tryPromise<void, Error>({
      try: (signal) => {
        signal.addEventListener("abort", () => {
          aborted = true
        })
        return new Promise((resolve) => {
          timeout.set(() => {
            resolve()
          }, 100)
        })
      },
      catch: () => new Error()
    })
    const program = effect.pipe(
      Effect.timeout("10 millis")
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Success")
    expect(aborted).toBe(true)
  })
})

import * as Effect from "effect/Effect"
import * as timeout from "effect/internal/timeout"
import { describe, expect, it } from "vitest"

describe.concurrent("Effect", () => {
  it("promise - sync fail", async () => {
    const effect = Effect.promise(() => {
      throw "fail"
      return Promise.resolve("hello")
    })
    const exit = await Effect.runPromiseExit(effect)
    expect(exit._tag).toBe("Failure")
  })

  it("promise - failure, no AbortSignal", async () => {
    const effect = Effect.promise<void>(() => {
      return new Promise((_resolve, reject) => {
        timeout.set(() => {
          reject("error")
        }, 5)
      })
    })
    const exit = await Effect.runPromiseExit(effect)
    expect(exit._tag).toBe("Failure")
  })

  it("promise - failure, AbortSignal", async () => {
    let aborted = false
    const effect = Effect.promise<void>((signal) => {
      signal.addEventListener("abort", () => {
        aborted = true
      })
      return new Promise((_resolve, reject) => {
        timeout.set(() => {
          reject("error")
        }, 5)
      })
    })
    const program = effect.pipe(
      Effect.timeout("10 millis")
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Failure")
    expect(aborted).toBe(false)
  })

  it("promise - success, no AbortSignal", async () => {
    const effect = Effect.promise<void>(() => {
      return new Promise((resolve) => {
        timeout.set(() => {
          resolve()
        }, 100)
      })
    })
    const exit = await Effect.runPromiseExit(effect)
    expect(exit._tag).toBe("Success")
  })

  it("promise - success, AbortSignal", async () => {
    let aborted = false
    const effect = Effect.promise<void>((signal) => {
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
})

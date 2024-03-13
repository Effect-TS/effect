import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import { describe, expect, it } from "vitest"

const succeedPromiseLike: PromiseLike<string> = {
  // @ts-ignore
  then(onfulfilled) {
    if (onfulfilled) {
      onfulfilled("succeed")
    }
    return this
  }
}

const failPromiseLike: PromiseLike<string> = {
  // @ts-ignore
  then(_, onrejected) {
    if (onrejected) {
      onrejected("fail")
    }
    return this
  }
}

describe("Effect", () => {
  it("promise - success with AbortSignal", async () => {
    let aborted = false
    const effect = Effect.promise<void>((signal) => {
      signal.addEventListener("abort", () => {
        aborted = true
      })
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve()
        }, 100)
      })
    })
    const program = effect.pipe(
      Effect.timeout("10 millis"),
      Effect.option
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Success")
    expect(aborted).toBe(true)
  })

  it("PromiseLike - succeed", async () => {
    const effect = Effect.promise<string>(() => succeedPromiseLike)
    const program = effect.pipe(
      Effect.timeout("10 millis"),
      Effect.option
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Success")

    if (exit._tag === "Success") {
      expect(exit.value).toEqual(Option.some("succeed"))
    }
  })

  it("PromiseLike - fail", async () => {
    const effect = Effect.promise<string>(() => failPromiseLike)
    const program = effect.pipe(
      Effect.timeout("10 millis"),
      Effect.option
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      expect(exit.cause.toString()).toEqual("Error: fail")
    }
  })
})

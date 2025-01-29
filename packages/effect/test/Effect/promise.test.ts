import { Cause, Effect, Option } from "effect"
import { assertFailure, assertSuccess, assertTrue } from "effect/test/util"
import { describe, it } from "vitest"

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
      }, { once: true })
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
    assertSuccess(exit, Option.none())
    assertTrue(aborted)
  })

  it("PromiseLike - succeed", async () => {
    const effect = Effect.promise<string>(() => succeedPromiseLike)
    const program = effect.pipe(
      Effect.timeout("10 millis"),
      Effect.option
    )
    const exit = await Effect.runPromiseExit(program)
    assertSuccess(exit, Option.some("succeed"))
  })

  it("PromiseLike - fail", async () => {
    const effect = Effect.promise<string>(() => failPromiseLike)
    const program = effect.pipe(
      Effect.timeout("10 millis"),
      Effect.option
    )
    const exit = await Effect.runPromiseExit(program)
    assertFailure(exit, Cause.die("fail"))
  })
})

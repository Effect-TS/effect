import * as Effect from "effect/Effect"
import * as timeout from "effect/internal/timeout"
import { describe, expect, it } from "vitest"

describe("Effect", () => {
  it("promise - success with AbortSignal", async () => {
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
      Effect.timeout("10 millis"),
      Effect.optionFromOptional
    )
    const exit = await Effect.runPromiseExit(program)
    expect(exit._tag).toBe("Success")
    expect(aborted).toBe(true)
  })
})

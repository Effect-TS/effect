import * as BrowserRuntime from "@effect/platform-browser/BrowserRuntime"
import { assert, describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

const pagehide = (persisted: boolean): PageTransitionEvent => {
  const event = new Event("pagehide")
  Object.defineProperty(event, "persisted", { value: persisted })
  return event as PageTransitionEvent
}

const makeProgram = () => {
  let finish: (() => void) | undefined
  let finalizations = 0
  let resolveCompleted!: () => void
  const completed = new Promise<void>((resolve) => {
    resolveCompleted = resolve
  })
  const effect = Effect.callback<void>((resume) => {
    finish = () => resume(Effect.void)
  }).pipe(
    Effect.ensuring(Effect.sync(() => {
      finalizations++
      resolveCompleted()
    }))
  )

  BrowserRuntime.runMain(effect)

  return {
    completed,
    finish: () => finish?.(),
    finalizations: () => finalizations
  }
}

describe("BrowserRuntime", () => {
  it("keeps the main program running after beforeunload", async () => {
    const program = makeProgram()

    globalThis.dispatchEvent(new Event("beforeunload"))
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.strictEqual(program.finalizations(), 0)

    program.finish()
    await program.completed
  })

  it("interrupts the main program when pagehide unloads the document", async () => {
    const program = makeProgram()

    globalThis.dispatchEvent(pagehide(false))
    await program.completed

    assert.strictEqual(program.finalizations(), 1)
  })

  it("keeps the main program running when pagehide enters the bfcache", async () => {
    const program = makeProgram()

    globalThis.dispatchEvent(pagehide(true))
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.strictEqual(program.finalizations(), 0)

    program.finish()
    await program.completed
  })
})

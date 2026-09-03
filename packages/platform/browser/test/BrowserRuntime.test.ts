import * as BrowserRuntime from "@effect/platform-browser/BrowserRuntime"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import { vi } from "vitest"

describe("BrowserRuntime", () => {
  it("invokes a custom teardown when the main effect completes", () => {
    const exits: Array<Exit.Exit<unknown, unknown>> = []

    BrowserRuntime.runMain(Effect.succeed("done"), {
      teardown: (exit, onExit) => {
        exits.push(exit)
        onExit(0)
      }
    })

    assert.deepStrictEqual(exits, [Exit.succeed("done")])
  })

  it("invokes a custom teardown when an async main effect completes", async () => {
    let completeProgram!: () => void
    const program = Effect.promise(() =>
      new Promise<void>((resolve) => {
        completeProgram = resolve
      })
    ).pipe(Effect.as("done"))
    let observeExit!: (exit: Exit.Exit<unknown, unknown>) => void
    const observedExit = new Promise<Exit.Exit<unknown, unknown>>((resolve) => {
      observeExit = resolve
    })

    BrowserRuntime.runMain(program, {
      teardown: (exit, onExit) => {
        observeExit(exit)
        onExit(0)
      }
    })

    completeProgram()
    assert.deepStrictEqual(await observedExit, Exit.succeed("done"))
  })

  it("removes the pagehide listener when the main effect completes", () => {
    const target = new EventTarget()
    const addEventListener = vi.spyOn(globalThis, "addEventListener").mockImplementation(
      target.addEventListener.bind(target)
    )
    const removeEventListener = vi.spyOn(globalThis, "removeEventListener").mockImplementation(
      target.removeEventListener.bind(target)
    )

    try {
      BrowserRuntime.runMain(Effect.void)

      assert.lengthOf(addEventListener.mock.calls, 1)
      assert.lengthOf(removeEventListener.mock.calls, 1)
      assert.strictEqual(removeEventListener.mock.calls[0][1], addEventListener.mock.calls[0][1])
      assert.isBelow(addEventListener.mock.invocationCallOrder[0], removeEventListener.mock.invocationCallOrder[0])
    } finally {
      removeEventListener.mockRestore()
      addEventListener.mockRestore()
    }
  })
})

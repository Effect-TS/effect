import * as BrowserRuntime from "@effect/platform-browser/BrowserRuntime"
import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit } from "effect"

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
})

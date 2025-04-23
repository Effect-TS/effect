import type * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import { NodeFileSystem, NodePath } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Array, Effect } from "effect"
import * as Console from "effect/Console"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as MockConsole from "./services/MockConsole.js"
import * as MockTerminal from "./services/MockTerminal.js"

const MainLive = Effect.gen(function*(_) {
  const console = yield* _(MockConsole.make)
  return Layer.mergeAll(
    Console.setConsole(console),
    NodeFileSystem.layer,
    MockTerminal.layer,
    NodePath.layer
  )
}).pipe(Layer.unwrapEffect)

const runEffect = <E, A>(
  self: Effect.Effect<A, E, CliApp.CliApp.Environment>
): Promise<A> => Effect.provide(self, MainLive).pipe(Effect.runPromise)

describe("Wizard", () => {
  it("should quit the wizard when CTRL+C is entered", () =>
    Effect.gen(function*(_) {
      const cli = Command.make("foo", { message: Options.text("message") }).pipe(
        Command.run({
          name: "Test",
          version: "1.0.0"
        })
      )
      const args = Array.make("node", "test", "--wizard")
      const fiber = yield* _(Effect.fork(cli(args)))
      yield* _(MockTerminal.inputKey("c", { ctrl: true }))
      yield* _(Fiber.join(fiber))
      const lines = yield* _(MockConsole.getLines({ stripAnsi: true }))
      const result = Array.some(lines, (line) => line.includes("Quitting wizard mode..."))
      expect(result).toBe(true)
    }).pipe(runEffect))
})

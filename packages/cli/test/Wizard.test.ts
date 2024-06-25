import type * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as MockConsole from "@effect/cli/test/services/MockConsole"
import * as MockTerminal from "@effect/cli/test/services/MockTerminal"
import {} from "@effect/platform"
import { NodeFileSystem, NodePath } from "@effect/platform-node"
import { Array, Effect } from "effect"
import * as Console from "effect/Console"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"

const MainLive = Effect.gen(function*(_) {
  const console = yield* MockConsole.make
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
      const fiber = yield* Effect.fork(cli(args))
      yield* MockTerminal.inputKey("c", { ctrl: true })
      yield* Fiber.join(fiber)
      const lines = yield* MockConsole.getLines({ stripAnsi: true })
      const result = Array.some(lines, (line) => line.includes("Quitting wizard mode..."))
      expect(result).toBe(true)
    }).pipe(runEffect))
})

import type * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Options from "@effect/cli/Options"
import * as MockConsole from "@effect/cli/test/services/MockConsole"
import * as MockTerminal from "@effect/cli/test/services/MockTerminal"
import * as FileSystem from "@effect/platform-node/FileSystem"
import * as Path from "@effect/platform-node/Path"
import { Effect, ReadonlyArray } from "effect"
import * as Console from "effect/Console"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"

const MainLive = Effect.gen(function*(_) {
  const console = yield* _(MockConsole.make)
  return Layer.mergeAll(
    Console.setConsole(console),
    FileSystem.layer,
    MockTerminal.layer,
    Path.layer
  )
}).pipe(Layer.unwrapEffect)

const runEffect = <E, A>(
  self: Effect.Effect<CliApp.CliApp.Environment, E, A>
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
      const args = ReadonlyArray.make("node", "test", "--wizard")
      const fiber = yield* _(Effect.fork(cli(args)))
      yield* _(MockTerminal.inputKey("c", { ctrl: true }))
      yield* _(Fiber.join(fiber))
      const lines = yield* _(MockConsole.getLines({ stripAnsi: true }))
      const result = ReadonlyArray.some(lines, (line) => line.includes("Quitting wizard mode..."))
      expect(result).toBe(true)
    }).pipe(runEffect))
})

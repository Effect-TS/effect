import type * as CliApp from "@effect/cli/CliApp"
import * as Command from "@effect/cli/Command"
import * as Prompt from "@effect/cli/Prompt"
import * as MockConsole from "@effect/cli/test/services/MockConsole"
import * as MockTerminal from "@effect/cli/test/services/MockTerminal"
import {} from "@effect/platform"
import { Array, Effect } from "effect"
import * as Console from "effect/Console"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"

const MainLive = Effect.gen(function*(_) {
  const console = yield* _(MockConsole.make)
  return Layer.mergeAll(
    Console.setConsole(console),
    MockTerminal.layer
  )
}).pipe(Layer.unwrapEffect)

const runEffect = <E, A>(
  self: Effect.Effect<A, E, CliApp.CliApp.Environment>
): Promise<A> => Effect.provide(self, MainLive).pipe(Effect.runPromise)

describe("Prompt", () => {
  describe("text", () => {
    it("should return an empty string when `default` on `Prompt.TextOptions` is not provided", () =>
      Effect.gen(function*(_) {
        const prompt = Prompt.text({
          message: "This should not have a default"
        })

        const command = Command.prompt(
          "prompt-command",
          prompt,
          (value) =>
            Console.log(
              `Prompt value: "${value}"`
            )
        )

        const cli = Command.run(command, {
          name: "Default Value App",
          version: "0.0.1"
        })

        const fiber = yield* _(Effect.fork(cli([])))
        yield* _(MockTerminal.inputKey("Enter"))
        yield* _(Fiber.join(fiber))
        const lines = yield* _(MockConsole.getLines({ stripAnsi: true }))
        const result = Array.some(lines, (line) => line.includes("Prompt value: \"\""))
        expect(result).toBe(true)
      }).pipe(runEffect))

    it("should respect the `default` property on `Prompt.TextOptions`", () =>
      Effect.gen(function*(_) {
        const prompt = Prompt.text({
          message: "This should have a default",
          default: "default-value"
        })

        const command = Command.prompt(
          "prompt-command",
          prompt,
          (value) =>
            Console.log(
              `Prompt value: "${value}"`
            )
        )

        const cli = Command.run(command, {
          name: "Default Value App",
          version: "0.0.1"
        })

        const fiber = yield* _(Effect.fork(cli([])))
        yield* _(MockTerminal.inputKey("Enter"))
        yield* _(Fiber.join(fiber))
        const lines = yield* _(MockConsole.getLines({ stripAnsi: true }))
        const result = Array.some(lines, (line) => line.includes("Prompt value: \"default-value\""))
        expect(result).toBe(true)
      }).pipe(runEffect))
  })
})

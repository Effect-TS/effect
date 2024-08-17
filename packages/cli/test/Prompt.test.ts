import * as Prompt from "@effect/cli/Prompt"
import * as MockConsole from "@effect/cli/test/services/MockConsole"
import * as MockTerminal from "@effect/cli/test/services/MockTerminal"
import { } from "@effect/platform"
import { Array, Effect } from "effect"
import * as Console from "effect/Console"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import { describe, expect, it } from "vitest"
import { Terminal } from "../../platform/src/Terminal.js"

const MainLive = Effect.gen(function*(_) {
  const console = yield* _(MockConsole.make)
  return Layer.mergeAll(
    Console.setConsole(console),
    MockTerminal.layer,
  )
}).pipe(Layer.unwrapEffect)

const runEffect = <E, A>(
  self: Effect.Effect<A, E, Terminal>
): Promise<A> => Effect.provide(self, MainLive).pipe(Effect.runPromise)

describe("Prompt", () => {
  describe("text", () => {
    it("should use the prompt value when no default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.text({
          message: "This does not have a default",
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)
        const lines = yield* MockConsole.getLines({ stripAnsi: true })
        const result = Array.some(lines, (line) => line.includes("? This does not have a default › "))
        expect(result).toBe(true)
      }).pipe(runEffect))

    it("should use the default value when the default is provided", () =>
      Effect.gen(function*() {
        const prompt = Prompt.text({
          message: "This should have a default",
          default: "default-value"
        })

        const fiber = yield* Effect.fork(prompt)
        yield* MockTerminal.inputKey("enter")
        yield* Fiber.join(fiber)
        const lines = yield* MockConsole.getLines({ stripAnsi: true })
        const result = Array.some(lines, (line) => line.includes("? This should have a default › default-value"))
        expect(result).toBe(true)
      }).pipe(runEffect))
  })
})

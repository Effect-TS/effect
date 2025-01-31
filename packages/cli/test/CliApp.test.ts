import type * as CliApp from "@effect/cli/CliApp"
import * as CliConfig from "@effect/cli/CliConfig"
import * as Command from "@effect/cli/Command"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as MockConsole from "@effect/cli/test/services/MockConsole"
import * as ValidationError from "@effect/cli/ValidationError"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Array, Console, Effect, FiberRef, Layer, LogLevel } from "effect"

const MainLive = Effect.gen(function*(_) {
  const console = yield* _(MockConsole.make)
  return Layer.mergeAll(
    Console.setConsole(console),
    NodeContext.layer
  )
}).pipe(Layer.unwrapEffect)

const runEffect = <E, A>(
  self: Effect.Effect<A, E, CliApp.CliApp.Environment>
): Promise<A> =>
  Effect.provide(self, MainLive).pipe(
    Effect.runPromise
  )

describe("CliApp", () => {
  it("should return an error if excess arguments are provided", () =>
    Effect.gen(function*() {
      const cli = Command.run(Command.make("foo"), {
        name: "Test",
        version: "1.0.0"
      })
      const args = Array.make("node", "test.js", "--bar")
      const result = yield* Effect.flip(cli(args))
      expect(result).toEqual(ValidationError.invalidValue(HelpDoc.p(
        "Received unknown argument: '--bar'"
      )))
    }).pipe(runEffect))

  describe("Built-In Options Processing", () => {
    it("should display built-in options in help if `CliConfig.showBuiltIns` is true", () => {
      const CliConfigLive = CliConfig.layer({
        showBuiltIns: true // this is the default
      })
      return Effect.gen(function*() {
        const cli = Command.run(Command.make("foo"), {
          name: "Test",
          version: "1.0.0"
        })
        yield* cli([])
        const lines = yield* MockConsole.getLines()
        const output = lines.join("\n")
        expect(output).toContain("--completions sh | bash | fish | zsh")
        expect(output).toContain("(-h, --help)")
        expect(output).toContain("--wizard")
        expect(output).toContain("--version")
      }).pipe(
        Effect.provide(Layer.mergeAll(MainLive, CliConfigLive)),
        Effect.runPromise
      )
    })

    it("should not display built-in options in help if `CliConfig.showBuiltIns` is false", () => {
      const CliConfigLive = CliConfig.layer({
        showBuiltIns: false
      })
      return Effect.gen(function*() {
        const cli = Command.run(Command.make("foo"), {
          name: "Test",
          version: "1.0.0"
        })
        yield* cli([])
        const lines = yield* MockConsole.getLines()
        const output = lines.join("\n")
        expect(output).not.toContain("--completions sh | bash | fish | zsh")
        expect(output).not.toContain("(-h, --help)")
        expect(output).not.toContain("--wizard")
        expect(output).not.toContain("--version")
      }).pipe(
        Effect.provide(Layer.mergeAll(MainLive, CliConfigLive)),
        Effect.runPromise
      )
    })

    it("should set the minimum log level for a command", () =>
      Effect.gen(function*() {
        let logLevel: LogLevel.LogLevel | undefined = undefined
        const logging = Command.make("logging").pipe(Command.withHandler(() =>
          Effect.gen(function*() {
            logLevel = yield* FiberRef.get(FiberRef.currentMinimumLogLevel)
          })
        ))
        const cli = Command.run(logging, {
          name: "Test",
          version: "1.0.0"
        })
        yield* cli(["node", "logging.js", "--log-level", "debug"])
        expect(logLevel).toEqual(LogLevel.Debug)
      }).pipe(runEffect))
  })
})

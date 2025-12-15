import * as Args from "@effect/cli/Args"
import type * as CliApp from "@effect/cli/CliApp"
import * as CliConfig from "@effect/cli/CliConfig"
import * as Command from "@effect/cli/Command"
import * as HelpDoc from "@effect/cli/HelpDoc"
import * as ValidationError from "@effect/cli/ValidationError"
import { NodeContext } from "@effect/platform-node"
import { describe, expect, it } from "@effect/vitest"
import { Array, Console, Effect, FiberRef, Layer, LogLevel } from "effect"
import * as MockConsole from "./services/MockConsole.js"

const MainLive = Effect.gen(function*() {
  const console = yield* MockConsole.make
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

    it("should set the minimum log level when using equals syntax (--log-level=...)", () =>
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
        yield* cli(["node", "logging.js", "--log-level=debug"])
        expect(logLevel).toEqual(LogLevel.Debug)
      }).pipe(runEffect))

    it("should handle paths with spaces when using --log-level", () =>
      Effect.gen(function*() {
        let executedValue: string | undefined = undefined
        const cmd = Command.make("test", { value: Args.text() }, ({ value }) =>
          Effect.sync(() => {
            executedValue = value
          }))
        const cli = Command.run(cmd, {
          name: "Test",
          version: "1.0.0"
        })
        // Simulate Windows path with spaces (e.g., "C:\Program Files\nodejs\node.exe")
        yield* cli(["C:\\Program Files\\node.exe", "C:\\My Scripts\\test.js", "--log-level", "info", "hello"])
        expect(executedValue).toEqual("hello")
      }).pipe(runEffect))
  })
})

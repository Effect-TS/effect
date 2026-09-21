import { assert, describe, it } from "@effect/vitest"
import { ConfigProvider, Effect, FileSystem, Layer, Path, Stdio } from "effect"
import { TestConsole } from "effect/testing"
import { CliOutput, Command, TerminalCapabilities } from "effect/unstable/cli"
import { ChildProcessSpawner } from "effect/unstable/process"
import * as MockTerminal from "./services/MockTerminal.ts"

const capabilities = (input: {
  readonly canColor: boolean
  readonly canAnimate?: boolean
  readonly canPrompt?: boolean
}): TerminalCapabilities.Service => ({
  canColor: input.canColor,
  canAnimate: input.canAnimate ?? false,
  canPrompt: input.canPrompt ?? false
})

const runnerLayer = Layer.mergeAll(
  TestConsole.layer,
  FileSystem.layerNoop({}),
  Path.layer,
  MockTerminal.layer,
  Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make(() => Effect.die("unused"))
  ),
  Stdio.layerTest({})
)

describe("TerminalCapabilities", () => {
  it("lets NO_COLOR win over FORCE_COLOR", () => {
    const detected = TerminalCapabilities.detect({
      noColor: "1",
      forceColor: "1",
      term: "xterm-256color",
      stdinIsTerminal: true,
      stdoutIsTerminal: true
    })
    assert.strictEqual(detected.canColor, false)
    assert.strictEqual(detected.canAnimate, true)
    assert.strictEqual(detected.canPrompt, true)
  })

  it("treats an empty FORCE_COLOR as unset", () => {
    const detected = TerminalCapabilities.detect({
      noColor: undefined,
      forceColor: "",
      term: "xterm-256color",
      stdinIsTerminal: false,
      stdoutIsTerminal: false
    })
    assert.strictEqual(detected.canColor, false)
  })

  it("does not treat FORCE_COLOR=0 or false as forcing", () => {
    const offTty = TerminalCapabilities.detect({
      noColor: undefined,
      forceColor: "0",
      term: "xterm-256color",
      stdinIsTerminal: false,
      stdoutIsTerminal: false
    })
    const onTty = TerminalCapabilities.detect({
      noColor: undefined,
      forceColor: "false",
      term: "xterm-256color",
      stdinIsTerminal: true,
      stdoutIsTerminal: true
    })
    assert.strictEqual(offTty.canColor, false)
    assert.strictEqual(onTty.canColor, true)
  })

  it("forces color off a TTY when FORCE_COLOR is set", () => {
    const detected = TerminalCapabilities.detect({
      noColor: undefined,
      forceColor: "1",
      term: "xterm-256color",
      stdinIsTerminal: false,
      stdoutIsTerminal: false
    })
    assert.strictEqual(detected.canColor, true)
    assert.strictEqual(detected.canAnimate, false)
    assert.strictEqual(detected.canPrompt, false)
  })

  it("clears color, animation, and prompting when TERM is dumb", () => {
    const detected = TerminalCapabilities.detect({
      noColor: undefined,
      forceColor: "1",
      term: "dumb",
      stdinIsTerminal: true,
      stdoutIsTerminal: true
    })
    assert.deepStrictEqual(detected, { canColor: false, canAnimate: false, canPrompt: false })
  })

  it("requires both streams to be terminals before prompting", () => {
    const detected = TerminalCapabilities.detect({
      noColor: undefined,
      forceColor: undefined,
      term: "xterm-256color",
      stdinIsTerminal: true,
      stdoutIsTerminal: false
    })
    assert.strictEqual(detected.canPrompt, false)
    assert.strictEqual(detected.canAnimate, false)
  })

  it.effect("reads the environment through ConfigProvider and treats empty values as unset", () =>
    Effect.gen(function*() {
      const detected = yield* TerminalCapabilities.TerminalCapabilities
      assert.strictEqual(detected.canColor, true)
      assert.strictEqual(detected.canAnimate, false)
      assert.strictEqual(detected.canPrompt, false)
    }).pipe(
      Effect.provide(TerminalCapabilities.layer),
      Effect.provide(Stdio.layerTest({
        stdinIsTerminal: Effect.succeed(false),
        stdoutIsTerminal: Effect.succeed(false)
      })),
      Effect.provideService(
        ConfigProvider.ConfigProvider,
        ConfigProvider.fromEnv({
          env: {
            NO_COLOR: "",
            FORCE_COLOR: "1",
            TERM: "xterm-256color"
          }
        })
      )
    ))

  it.effect("follows canColor for version output when the built-in formatter is still installed", () =>
    Effect.gen(function*() {
      yield* Command.runWith(Command.make("tool"), { version: "1.2.3" })(["--version"])
      const output = (yield* TestConsole.logLines).join("\n")
      assert.ok(output.includes("\x1b[1mtool"))
      assert.ok(output.includes("1.2.3"))
    }).pipe(
      Effect.provide(runnerLayer),
      Effect.provideService(TerminalCapabilities.TerminalCapabilities, capabilities({ canColor: true }))
    ))

  it.effect("keeps a custom formatter when capabilities are also installed", () =>
    Effect.gen(function*() {
      yield* Command.runWith(Command.make("tool"), { version: "1.2.3" })(["--version"])
      const output = (yield* TestConsole.logLines).join("\n")
      assert.strictEqual(output.includes("\x1b["), false)
      assert.ok(output.includes("tool v1.2.3"))
    }).pipe(
      Effect.provide(runnerLayer),
      Effect.provideService(CliOutput.Formatter, CliOutput.defaultFormatter({ colors: false })),
      Effect.provideService(
        TerminalCapabilities.TerminalCapabilities,
        capabilities({ canColor: true })
      )
    ))

  it.effect("disables built-in color when canColor is false", () =>
    Effect.gen(function*() {
      const formatter = yield* CliOutput.resolveFormatter
      assert.strictEqual(formatter.formatVersion("tool", "1.2.3").includes("\x1b["), false)
    }).pipe(
      Effect.provideService(TerminalCapabilities.TerminalCapabilities, capabilities({ canColor: false }))
    ))
})

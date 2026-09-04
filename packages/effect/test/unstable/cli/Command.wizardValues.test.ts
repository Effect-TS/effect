import { assert, describe, it } from "@effect/vitest"
import { Effect, FileSystem, Layer, Path, Redacted, Stdio } from "effect"
import { TestConsole } from "effect/testing"
import { Argument, CliOutput, Command, Flag } from "effect/unstable/cli"
import { ChildProcessSpawner } from "effect/unstable/process"
import * as MockTerminal from "./services/MockTerminal.ts"
import * as TestActions from "./services/TestActions.ts"

const TestLayer = Layer.mergeAll(
  TestActions.layer,
  TestConsole.layer,
  FileSystem.layerNoop({}),
  Path.layer,
  MockTerminal.layer,
  CliOutput.layer(CliOutput.defaultFormatter({ colors: false })),
  Layer.succeed(
    ChildProcessSpawner.ChildProcessSpawner,
    ChildProcessSpawner.make(() => Effect.die("Not implemented"))
  ),
  Stdio.layerTest({})
)

type Input = { readonly text: string } | { readonly key: string }
interface Case {
  readonly id: string
  readonly flag: Flag.Flag<unknown>
  readonly input: ReadonlyArray<Input>
  readonly value: unknown
  readonly args: ReadonlyArray<string>
  readonly display: string
  readonly hidden?: string
}
const enter: Input = { key: "enter" }
const text = (value: string): ReadonlyArray<Input> => [{ text: value }, enter]
const cases: ReadonlyArray<Case> = [
  {
    id: "negative-integer",
    flag: Flag.integer("offset"),
    input: text("-2"),
    value: -2,
    args: ["--offset=-2"],
    display: "$ demo --offset=-2"
  },
  {
    id: "positive-integer",
    flag: Flag.integer("offset"),
    input: text("2"),
    value: 2,
    args: ["--offset", "2"],
    display: "$ demo --offset 2"
  },
  ...[
    { id: "short-option", value: "-v", args: ["--value=-v"], display: "$ demo --value=-v" },
    { id: "long-option", value: "--verbose", args: ["--value=--verbose"], display: "$ demo --value=--verbose" },
    { id: "double-hyphen", value: "--", args: ["--value=--"], display: "$ demo --value=--" },
    {
      id: "long-option-equals",
      value: "--mode=x=y",
      args: ["--value=--mode=x=y"],
      display: "$ demo --value=--mode=x=y"
    },
    { id: "short-option-equals", value: "-x=y", args: ["--value=-x=y"], display: "$ demo --value=-x=y" },
    { id: "ordinary", value: "plain", args: ["--value", "plain"], display: "$ demo --value plain" },
    {
      id: "internal-hyphen",
      value: "alpha-beta",
      args: ["--value", "alpha-beta"],
      display: "$ demo --value alpha-beta"
    },
    { id: "ordinary-equals", value: "key=value", args: ["--value", "key=value"], display: "$ demo --value key=value" },
    { id: "empty", value: "", args: ["--value", ""], display: "$ demo --value ''" },
    { id: "single-dash", value: "-", args: ["--value", "-"], display: "$ demo --value -" },
    { id: "spaces", value: "two words", args: ["--value", "two words"], display: "$ demo --value 'two words'" },
    { id: "leading-equals", value: "=value", args: ["--value", "=value"], display: "$ demo --value =value" }
  ].map((entry) => ({ ...entry, flag: Flag.string("value"), input: text(entry.value) })),
  {
    id: "redacted-option-looking",
    flag: Flag.redacted("value"),
    input: text("-fictional-a8"),
    value: "-fictional-a8",
    args: ["--value=-fictional-a8"],
    display: "$ demo '--value=<redacted>'",
    hidden: "-fictional-a8"
  },
  {
    id: "redacted-ordinary",
    flag: Flag.redacted("value"),
    input: text("fictional-a8"),
    value: "fictional-a8",
    args: ["--value", "fictional-a8"],
    display: "$ demo --value '<redacted>'",
    hidden: "fictional-a8"
  },
  {
    id: "repeated-mixed",
    flag: Flag.string("value").pipe(Flag.atLeast(1)),
    input: [{ key: "backspace" }, ...text("4"), ...text("-v"), ...text("plain"), ...text("--name=x"), ...text("")],
    value: ["-v", "plain", "--name=x", ""],
    args: ["--value=-v", "--value", "plain", "--value=--name=x", "--value", ""],
    display: "$ demo --value=-v --value plain --value=--name=x --value ''"
  },
  {
    id: "repeated-ordinary",
    flag: Flag.string("value").pipe(Flag.atLeast(1)),
    input: [{ key: "backspace" }, ...text("2"), ...text("first"), ...text("second")],
    value: ["first", "second"],
    args: ["--value", "first", "--value", "second"],
    display: "$ demo --value first --value second"
  },
  {
    id: "boolean-true",
    flag: Flag.boolean("value"),
    input: [{ key: "y" }],
    value: true,
    args: ["--value", "true"],
    display: "$ demo --value true"
  },
  {
    id: "boolean-false",
    flag: Flag.boolean("value"),
    input: [{ key: "n" }],
    value: false,
    args: ["--value", "false"],
    display: "$ demo --value false"
  }
]

describe("wizard value round trips", () => {
  for (const entry of cases) {
    for (const mode of ["manual", "programmatic", "built-in"] as const) {
      it.live(`${mode}: ${entry.id}`, () =>
        Effect.gen(function*() {
          const captured: Array<{ readonly value: unknown; readonly tail: string }> = []
          const command = Command.make("demo", {
            value: entry.flag,
            tail: Argument.string("tail")
          }, ({ tail, value }) =>
            Effect.sync(() => {
              captured.push({ value: Redacted.isRedacted(value) ? Redacted.value(value) : value, tail })
            }))
          const run = Command.runWith(command, { version: "1.0.0", renderErrors: false })
          if (mode === "manual") {
            const result = yield* Effect.result(run([...entry.args, "tail"]))
            assert.deepStrictEqual({ outcome: result._tag, captured }, {
              outcome: "Success",
              captured: [{ value: entry.value, tail: "tail" }]
            })
            return
          }

          // A finite queue, preloaded in full. Each test owns its terminal scope.
          // The trailing ordinary positional forces a Current command render after flags.
          const input = [...entry.input, ...text("tail"), ...(mode === "built-in" ? [enter] : [])]
          for (const event of input) {
            if ("text" in event) yield* MockTerminal.inputText(event.text)
            else yield* MockTerminal.inputKey(event.key)
          }
          const args = mode === "programmatic" ? yield* Command.wizard(command) : undefined
          const result = yield* Effect.result(run(args === undefined ? ["--wizard"] : args.slice(1)))
          const output = [...yield* TestConsole.logLines, ...yield* MockTerminal.displayLines].join("\n")
          const current = output.slice(
            output.indexOf("Current command"),
            mode === "built-in" ? output.indexOf("Command ready") : undefined
          )
          assert.include(output, "Current command")
          assert.include(output, "Tail")
          if (entry.hidden !== undefined) assert.notInclude(output, entry.hidden)
          if (mode === "built-in") {
            assert.include(output, "Command ready")
            assert.include(output, "Run this command?")
          }
          // The final assertion checks the complete public outcome, not timeout or an internal wizard result.
          assert.deepStrictEqual({
            outcome: result._tag,
            error: result._tag === "Failure" ? result.failure._tag : undefined,
            captured,
            args,
            current: current.includes(entry.display),
            ready: mode === "built-in"
              ? output.slice(output.indexOf("Command ready")).includes(entry.display)
              : undefined
          }, {
            outcome: "Success",
            error: undefined,
            captured: [{ value: entry.value, tail: "tail" }],
            args: mode === "programmatic" ? ["demo", ...entry.args, "tail"] : undefined,
            current: true,
            ready: mode === "built-in" ? true : undefined
          })
        }).pipe(Effect.provide(TestLayer), Effect.timeout("2 seconds")), 5_000)
    }
  }
})

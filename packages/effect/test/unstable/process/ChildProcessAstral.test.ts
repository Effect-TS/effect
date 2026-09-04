import { assert, describe, it } from "@effect/vitest"
import { ChildProcess } from "effect/unstable/process"

type Declaration =
  | readonly ["StandardCommand", string, ReadonlyArray<string>, ChildProcess.CommandOptions]
  | readonly ["PipedCommand", Declaration, Declaration, ChildProcess.PipeOptions]

const declaration = (command: ChildProcess.Command): Declaration =>
  command._tag === "StandardCommand"
    ? [command._tag, command.command, command.args, command.options]
    : [command._tag, declaration(command.left), declaration(command.right), command.options]

const options: ChildProcess.CommandOptions = Object.freeze({
  cwd: "/declaration-only",
  env: Object.freeze({ R8_FIXTURE: "owned" }),
  extendEnv: false,
  shell: false,
  stdin: "ignore",
  stdout: "pipe",
  stderr: "inherit"
})
const expectedOptions: ChildProcess.CommandOptions = Object.freeze({
  cwd: "/declaration-only",
  env: Object.freeze({ R8_FIXTURE: "owned" }),
  extendEnv: false,
  shell: false,
  stdin: "ignore",
  stdout: "pipe",
  stderr: "inherit"
})

const standard = (
  command: string,
  args: ReadonlyArray<string>,
  retainedOptions: ChildProcess.CommandOptions = {}
): Declaration => Object.freeze(["StandardCommand", command, Object.freeze(args), Object.freeze(retainedOptions)])

const fixtures: ReadonlyArray<{
  readonly name: string
  readonly build: () => ChildProcess.Command
  readonly expected: Declaration
}> = Object.freeze([
  {
    name: "astral argument before a following argument",
    build: () => ChildProcess.make`echo \u{1F600} tail`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "astral at the start of the command",
    build: () => ChildProcess.make`\u{1F600} tail`,
    expected: standard("😀", ["tail"])
  },
  {
    name: "astral in the middle of an argument",
    build: () => ChildProcess.make`echo pre\u{1F600}post tail`,
    expected: standard("echo", ["pre😀post", "tail"])
  },
  {
    name: "astral in the middle of the command",
    build: () => ChildProcess.make`pre\u{1F600}post tail`,
    expected: standard("pre😀post", ["tail"])
  },
  {
    name: "repeated adjacent astral escapes",
    build: () => ChildProcess.make`echo \u{1F600}\u{1F642} tail`,
    expected: standard("echo", ["😀🙂", "tail"])
  },
  {
    name: "repeated separated astral escapes",
    build: () => ChildProcess.make`echo \u{1F600} \u{1F642} tail`,
    expected: standard("echo", ["😀", "🙂", "tail"])
  },
  {
    name: "astral lower bound",
    build: () => ChildProcess.make`echo \u{10000} tail`,
    expected: standard("echo", [String.fromCodePoint(0x10000), "tail"])
  },
  {
    name: "astral upper bound",
    build: () => ChildProcess.make`echo \u{10FFFF} tail`,
    expected: standard("echo", [String.fromCodePoint(0x10ffff), "tail"])
  },
  {
    name: "astral leading zeroes and lowercase digits",
    build: () => ChildProcess.make`echo \u{000001f600} tail`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "astral before final raw space",
    build: () => ChildProcess.make`echo \u{1F600} `,
    expected: standard("echo", ["😀"])
  },
  {
    name: "astral segment before separate interpolation",
    build: () => ChildProcess.make`echo \u{1F600} ${"tail"}`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "astral segment before adjacent interpolation",
    build: () => ChildProcess.make`echo \u{1F600}${"post"} tail`,
    expected: standard("echo", ["😀post", "tail"])
  },
  {
    name: "astral after interpolation",
    build: () => ChildProcess.make`echo ${"head"} \u{1F600} tail`,
    expected: standard("echo", ["head", "😀", "tail"])
  },
  {
    name: "astral with escaped whitespace inside argument",
    build: () => ChildProcess.make`echo \u{1F600}\u{20}post tail`,
    expected: standard("echo", ["😀 post", "tail"])
  },
  {
    name: "astral with a following literal newline delimiter",
    build: () =>
      ChildProcess.make`echo \u{1F600}
tail`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "options template retains all supplied options",
    build: () => ChildProcess.make(options)`echo \u{1F600} tail`,
    expected: standard("echo", ["😀", "tail"], expectedOptions)
  },
  {
    name: "prefix template retains all underlying options",
    build: () => ChildProcess.make("echo", ["body"], options).pipe(ChildProcess.prefix`prefix \u{1F600} tail`),
    expected: standard("prefix", ["😀", "tail", "echo", "body"], expectedOptions)
  },
  {
    name: "prefix template changes only the leftmost pipeline declaration",
    build: () =>
      ChildProcess.make("echo", ["body"], options).pipe(
        ChildProcess.pipeTo(ChildProcess.make("middle", ["one"], { shell: false }), { from: "all" }),
        ChildProcess.pipeTo(ChildProcess.make("right", ["two"], { cwd: "/right-only" }), { from: "stderr" }),
        ChildProcess.prefix`prefix \u{1F600} tail`
      ),
    expected: [
      "PipedCommand",
      [
        "PipedCommand",
        standard("prefix", ["😀", "tail", "echo", "body"], expectedOptions),
        standard("middle", ["one"], { shell: false }),
        { from: "all" }
      ],
      standard("right", ["two"], { cwd: "/right-only" }),
      { from: "stderr" }
    ]
  },
  {
    name: "literal emoji control",
    build: () => ChildProcess.make`echo 😀 tail`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "scalar interpolation control",
    build: () => ChildProcess.make`echo ${"😀"} tail`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "array interpolation control",
    build: () => ChildProcess.make`echo ${["😀", "tail"]}`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "array constructor control",
    build: () => ChildProcess.make("echo", ["😀", "tail"]),
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "terminal astral argument control",
    build: () => ChildProcess.make`echo \u{1F600}`,
    expected: standard("echo", ["😀"])
  },
  {
    name: "terminal astral command control",
    build: () => ChildProcess.make`\u{1F600}`,
    expected: standard("😀", [])
  },
  {
    name: "BMP braced Unicode control",
    build: () => ChildProcess.make`echo \u{263A} tail`,
    expected: standard("echo", ["☺", "tail"])
  },
  {
    name: "BMP upper bound control",
    build: () => ChildProcess.make`echo \u{FFFF} tail`,
    expected: standard("echo", [String.fromCharCode(0xffff), "tail"])
  },
  {
    name: "braced Unicode zero control",
    build: () => ChildProcess.make`echo \u{0} tail`,
    expected: standard("echo", ["\0", "tail"])
  },
  {
    name: "separate BMP braced surrogate escapes control",
    build: () => ChildProcess.make`echo \u{D83D}\u{DE00} tail`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "separate fixed width surrogate escapes control",
    build: () => ChildProcess.make`echo \uD83D\uDE00 tail`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "mixed braced and fixed width surrogate escapes control",
    build: () => ChildProcess.make`echo \u{D83D}\uDE00 tail`,
    expected: standard("echo", ["😀", "tail"])
  },
  {
    name: "lone high surrogate escape control",
    build: () => ChildProcess.make`echo \u{D83D} tail`,
    expected: standard("echo", ["\uD83D", "tail"])
  },
  {
    name: "lone low surrogate escape control",
    build: () => ChildProcess.make`echo \u{DE00} tail`,
    expected: standard("echo", ["\uDE00", "tail"])
  },
  {
    name: "escaped space control",
    build: () => ChildProcess.make`echo a\u{20}b tail`,
    expected: standard("echo", ["a b", "tail"])
  },
  {
    name: "fixed width Unicode space control",
    build: () => ChildProcess.make`echo a\u0020b tail`,
    expected: standard("echo", ["a b", "tail"])
  },
  {
    name: "fixed width hexadecimal space control",
    build: () => ChildProcess.make`echo a\x20b tail`,
    expected: standard("echo", ["a b", "tail"])
  },
  {
    name: "escaped whitespace control",
    build: () => ChildProcess.make`echo a\n\t\rb tail`,
    expected: standard("echo", ["a\n\t\rb", "tail"])
  },
  {
    name: "literal whitespace control",
    build: () =>
      ChildProcess.make`echo a
b tail`,
    expected: standard("echo", ["a", "b", "tail"])
  },
  {
    name: "line continuation control",
    build: () =>
      ChildProcess.make`echo a\
b tail`,
    expected: standard("echo", ["ab", "tail"])
  },
  {
    name: "literal backslash escape text control",
    build: () => ChildProcess.make`echo \\u{1F600} tail`,
    expected: standard("echo", ["\\u{1F600}", "tail"])
  }
])

describe("ChildProcess astral escape declarations", () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const actual = declaration(fixture.build())
      console.log(JSON.stringify({ fixture: fixture.name, actual, expected: fixture.expected }))
      assert.deepStrictEqual(actual, fixture.expected)
    })
  }
})

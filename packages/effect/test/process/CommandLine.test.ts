import { assert, describe, it } from "@effect/vitest"
import { Redacted, Result } from "effect"
import { CommandLine } from "effect/process"

const failure = <A>(result: Result.Result<A, CommandLine.CommandLineError>): CommandLine.CommandLineError => {
  if (Result.isSuccess(result)) assert.fail(`expected a failure, got ${JSON.stringify(result.success)}`)
  return result.failure
}

const tricky = [
  "",
  "plain",
  "a b",
  "it's",
  "a\\b",
  "\\",
  "\"",
  "a\"b\\",
  "a\\\\\"b",
  "=ls",
  "%self",
  "{a,b}",
  "~/x",
  "#x",
  "$HOME",
  "`id`",
  "*.txt",
  "a\nb",
  "\t",
  "ü ’",
  "-rf"
]

describe("CommandLine", () => {
  describe("quote", () => {
    it("quotes for POSIX shells", () => {
      const cases: Array<[CommandLine.Word, string]> = [
        ["plain", "plain"],
        ["path/to.file:1,2@x+y-z_", "path/to.file:1,2@x+y-z_"],
        ["", "''"],
        ["a b", "'a b'"],
        ["it's", "'it'\\''s'"],
        ["a\\b", "'a'\\\\'b'"],
        ["=ls", "'=ls'"],
        ["%self", "'%self'"],
        ["{a,b}", "'{a,b}'"],
        ["~", "'~'"],
        ["#x", "'#x'"],
        ["$HOME", "'$HOME'"],
        ["a\nb", "'a\nb'"],
        [Redacted.make("a b"), "'a b'"]
      ]
      for (const [input, expected] of cases) {
        assert.strictEqual(Result.getOrThrow(CommandLine.quote(input)), expected, String(input))
      }
      assert.strictEqual(failure(CommandLine.quote("a\0b")).reason, "NulCharacter")
    })

    it("quotes for PowerShell", () => {
      const cases: Array<[string, string]> = [
        ["plain", "'plain'"],
        ["", "''"],
        ["it's", "'it''s'"],
        ["x\u2019; y\u2018", "'x\u2019\u2019; y\u2018\u2018'"],
        ["\u201A\u201B", "'\u201A\u201A\u201B\u201B'"],
        ["$env:HOME `n", "'$env:HOME `n'"]
      ]
      for (const [input, expected] of cases) {
        assert.strictEqual(Result.getOrThrow(CommandLine.quote(input, { format: "powershell" })), expected, input)
      }
    })

    it("quotes Windows arguments", () => {
      const cases: Array<[string, string]> = [
        ["plain", "plain"],
        ["a\\b", "a\\b"],
        ["", "\"\""],
        ["a b", "\"a b\""],
        ["a\tb", "\"a\tb\""],
        ["a\"b", "\"a\\\"b\""],
        ["a\\\"b", "\"a\\\\\\\"b\""],
        ["a b\\", "\"a b\\\\\""],
        ["a b\\\\", "\"a b\\\\\\\\\""]
      ]
      for (const [input, expected] of cases) {
        assert.strictEqual(Result.getOrThrow(CommandLine.quote(input, { format: "windows" })), expected, input)
      }
    })
  })

  describe("join", () => {
    it("joins a program and its arguments", () => {
      const args = ["git", "commit", "-m", "fix: don't"]
      assert.strictEqual(Result.getOrThrow(CommandLine.join(args)), "git commit -m 'fix: don'\\''t'")
      assert.strictEqual(
        Result.getOrThrow(CommandLine.join(args, { format: "powershell" })),
        "& 'git' 'commit' '-m' 'fix: don''t'"
      )
      assert.strictEqual(
        Result.getOrThrow(CommandLine.join(args, { format: "windows" })),
        "git commit -m \"fix: don't\""
      )
      assert.strictEqual(Result.getOrThrow(CommandLine.join([])), "")
      const error = failure(CommandLine.join(["echo", "a\0b"]))
      assert.deepStrictEqual([error.reason, error.message], ["NulCharacter", "Argument 1 contains a NUL character"])
    })

    it("quotes Windows program names without backslash escapes", () => {
      const cases: Array<[string, string]> = [
        ["C:\\Program Files\\app.exe", "\"C:\\Program Files\\app.exe\""],
        ["C:\\tools\\", "C:\\tools\\"],
        ["", "\"\""]
      ]
      for (const [program, expected] of cases) {
        assert.strictEqual(Result.getOrThrow(CommandLine.join([program], { format: "windows" })), expected)
      }
      assert.strictEqual(failure(CommandLine.join(["a\"b"], { format: "windows" })).reason, "InvalidArgument")
    })

    it("rejects the argument --% for PowerShell", () => {
      const error = failure(CommandLine.join(["node", "a", "--%"], { format: "powershell" }))
      assert.deepStrictEqual([error.reason, error.message], [
        "InvalidArgument",
        "Argument 2 is \"--%\", which PowerShell drops when it calls a program"
      ])
      assert.strictEqual(Result.getOrThrow(CommandLine.quote("--%", { format: "powershell" })), "'--%'")
    })

    it("round-trips through split", () => {
      for (const format of ["posix", "windows"] as const) {
        for (const words of [["prog", ...tricky], ["if", "then"]]) {
          const line = Result.getOrThrow(CommandLine.join(words, { format }))
          assert.deepStrictEqual(Result.getOrThrow(CommandLine.split(line, { format })), words, `${format}: ${line}`)
        }
      }
    })
  })

  describe("display", () => {
    it("masks Redacted words, escapes control characters and accepts any input", () => {
      const words = ["curl", "-H", Redacted.make("Authorization: hunter2"), "a\nb\u001b[2J\0"]
      assert.strictEqual(CommandLine.display(words), "curl -H <redacted> 'a\\nb\\u001b[2J\\u0000'")
      assert.strictEqual(
        CommandLine.display(words, { format: "powershell" }),
        "& 'curl' '-H' <redacted> 'a\\nb\\u001b[2J\\u0000'"
      )
      assert.strictEqual(CommandLine.display(["a\"b", "c d"], { format: "windows" }), "\"a\\\"b\" \"c d\"")
      assert.strictEqual(CommandLine.display([]), "")
      assert.strictEqual(CommandLine.display(["if", "x"]), "'if' x")
    })
  })

  describe("split", () => {
    it("removes POSIX quotes and escapes", () => {
      const cases: Array<[string, Array<string>]> = [
        ["", []],
        ["  a \t b  ", ["a", "b"]],
        ["a 'b c' d", ["a", "b c", "d"]],
        ["a \"b \\\"c\\\" \\$d \\\\ \\x\"", ["a", "b \"c\" $d \\ \\x"]],
        ["a\\ b", ["a b"]],
        ["'' \"\"", ["", ""]],
        ["a''b", ["ab"]],
        ["a\\\nb", ["ab"]],
        ["'a\nb' \"c\nd\"", ["a\nb", "c\nd"]],
        ["'$HOME' \\$HOME \"cost$\" cost$", ["$HOME", "$HOME", "cost$", "cost$"]],
        ["find . -exec rm {} \\;", ["find", ".", "-exec", "rm", "{}", ";"]],
        ["env FOO=bar --x=1 a#b x~ '!'", ["env", "FOO=bar", "--x=1", "a#b", "x~", "!"]],
        ["'FOO=bar' cmd", ["FOO=bar", "cmd"]]
      ]
      for (const [line, expected] of cases) {
        assert.deepStrictEqual(Result.getOrThrow(CommandLine.split(line)), expected, line)
      }
    })

    it("rejects POSIX syntax that needs a shell", () => {
      const cases: Array<[string, CommandLine.CommandLineError["reason"], number]> = [
        ["a | b", "UnsupportedSyntax", 2],
        ["a && b", "UnsupportedSyntax", 2],
        ["a; b", "UnsupportedSyntax", 1],
        ["a >f", "UnsupportedSyntax", 2],
        ["(a)", "UnsupportedSyntax", 0],
        ["a\nb", "UnsupportedSyntax", 1],
        ["echo $HOME", "UnsupportedSyntax", 5],
        ["echo ${x}", "UnsupportedSyntax", 5],
        ["echo $(id)", "UnsupportedSyntax", 5],
        ["echo `id`", "UnsupportedSyntax", 5],
        ["echo \"a $x\"", "UnsupportedSyntax", 8],
        ["echo $'a'", "UnsupportedSyntax", 5],
        ["ls *.txt", "UnsupportedSyntax", 3],
        ["curl x?a=1", "UnsupportedSyntax", 6],
        ["ls [ab]", "UnsupportedSyntax", 3],
        ["cd ~", "UnsupportedSyntax", 3],
        ["echo #x", "UnsupportedSyntax", 5],
        ["echo {a,b}", "UnsupportedSyntax", 7],
        ["echo a{1..3}", "UnsupportedSyntax", 8],
        ["=ls", "UnsupportedSyntax", 0],
        ["FOO=bar cmd", "UnsupportedSyntax", 3],
        ["if true", "UnsupportedSyntax", 2],
        ["! cmd", "UnsupportedSyntax", 1],
        ["'open", "UnterminatedQuote", 0],
        ["a \"b", "UnterminatedQuote", 2],
        ["a\\", "InvalidEscape", 1],
        ["a\0b", "NulCharacter", 1]
      ]
      for (const [line, reason, offset] of cases) {
        const error = failure(CommandLine.split(line))
        assert.deepStrictEqual([error.reason, error.offset], [reason, offset], line)
      }
    })

    it("follows the Windows C runtime rules", () => {
      const cases: Array<[string, Array<string>]> = [
        ["", []],
        ["  prog", ["prog"]],
        ["prog \"abc\" d e", ["prog", "abc", "d", "e"]],
        ["prog a\\\\b d\"e f\"g h", ["prog", "a\\\\b", "de fg", "h"]],
        ["prog a\\\\\\\"b c d", ["prog", "a\\\"b", "c", "d"]],
        ["prog a\\\\\\\\\"b c\" d e", ["prog", "a\\\\b c", "d", "e"]],
        ["prog a\"b\"\" c d", ["prog", "ab\" c d"]],
        ["prog \"\" x", ["prog", "", "x"]],
        ["prog \"a b", ["prog", "a b"]],
        ["\"C:\\Program Files\\app.exe\" --flag", ["C:\\Program Files\\app.exe", "--flag"]],
        ["C:\\tools\\\"x y\" z", ["C:\\tools\\x y", "z"]]
      ]
      for (const [line, expected] of cases) {
        assert.deepStrictEqual(Result.getOrThrow(CommandLine.split(line, { format: "windows" })), expected, line)
      }
      assert.strictEqual(failure(CommandLine.split("a\0b", { format: "windows" })).reason, "NulCharacter")
    })
  })

  describe("template", () => {
    it("splits the text and keeps values literal", () => {
      const message = "fix: a b; $HOME"
      assert.deepStrictEqual(
        Result.getOrThrow(CommandLine.template`git commit -m ${message} "two words" 'it''s'`),
        ["git", "commit", "-m", message, "two words", "its"]
      )
      assert.deepStrictEqual(
        Result.getOrThrow(CommandLine.template`docker run
          --rm ${"img"}`),
        ["docker", "run", "--rm", "img"]
      )
    })

    it("joins values with the surrounding argument", () => {
      const cases: Array<[Result.Result<Array<CommandLine.Word>, CommandLine.CommandLineError>, Array<string>]> = [
        [CommandLine.template`--x=${1} ${true}`, ["--x=1", "true"]],
        [CommandLine.template`"${"a"} ${"b"}"`, ["a b"]],
        [CommandLine.template`'${"$x"}'-y`, ["$x-y"]],
        [CommandLine.template`cost $${5}`, ["cost", "$5"]],
        [CommandLine.template`a ${""}`, ["a", ""]]
      ]
      for (const [result, expected] of cases) {
        assert.deepStrictEqual(Result.getOrThrow(result), expected)
      }
    })

    it("adds one argument per array element", () => {
      assert.deepStrictEqual(Result.getOrThrow(CommandLine.template`ls ${["-l", "a b"]} x`), ["ls", "-l", "a b", "x"])
      assert.deepStrictEqual(Result.getOrThrow(CommandLine.template`ls ${[]} x`), ["ls", "x"])
      assert.deepStrictEqual(Result.getOrThrow(CommandLine.template`ls ${["a"]}`), ["ls", "a"])
      for (const result of [CommandLine.template`--x=${["a"]}`, CommandLine.template`${["a"]}b`]) {
        assert.strictEqual(failure(result).reason, "UnsupportedSyntax")
      }
    })

    it("makes arguments with Redacted values Redacted", () => {
      const password = Redacted.make("hunter2")
      const words = Result.getOrThrow(CommandLine.template`psql "--password=${password}" ${[password]} -h db`)
      assert.strictEqual(words.length, 5)
      assert.isTrue(Redacted.isRedacted(words[1]))
      assert.strictEqual(Redacted.value(words[1] as Redacted.Redacted<string>), "--password=hunter2")
      assert.strictEqual(words[2], password)
      assert.strictEqual(CommandLine.display(words), "psql <redacted> <redacted> -h db")
      assert.strictEqual(Result.getOrThrow(CommandLine.join(words)), "psql '--password=hunter2' hunter2 -h db")
    })

    it("rejects shell syntax and invalid escapes without offsets", () => {
      const invalidEscape = Object.assign(["echo \\unicode"], { raw: ["echo \\unicode"] })
      invalidEscape[0] = undefined as unknown as string
      const cases: Array<[Result.Result<Array<CommandLine.Word>, CommandLine.CommandLineError>, string]> = [
        [CommandLine.template`ls | wc`, "UnsupportedSyntax"],
        [CommandLine.template`echo $HOME`, "UnsupportedSyntax"],
        [CommandLine.template`echo "${"a"}`, "UnterminatedQuote"],
        [CommandLine.template`echo ${"a\0"}`, "NulCharacter"],
        [CommandLine.template`echo \\\0`, "NulCharacter"],
        [CommandLine.template(invalidEscape as unknown as TemplateStringsArray), "InvalidEscape"]
      ]
      for (const [result, reason] of cases) {
        const error = failure(result)
        assert.deepStrictEqual([error.reason, error.offset], [reason, undefined], error.message)
      }
    })
  })
})

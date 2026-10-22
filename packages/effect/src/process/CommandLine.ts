/**
 * Converts between argument lists and command lines: the single strings that
 * a shell, or a Windows program, turns back into arguments.
 *
 * The rules depend on what parses the string, not on the platform that builds
 * it, so every function takes an explicit `format`:
 *
 * - `"posix"` (the default) for `sh`, `dash`, `bash` and `zsh`. Quoted output
 *   is also read the same way by `fish`.
 * - `"powershell"` for PowerShell 7.3 or later.
 * - `"windows"` for the Microsoft C runtime rules that most Windows programs
 *   use to split their command line.
 *
 * SSH sends one command line to the login shell of the remote account, so the
 * format must match that shell. Docker and Kubernetes exec take argument lists
 * and need no command line at all.
 *
 * Arguments can be `Redacted` strings. `quote` and `join` include their values,
 * because their output is meant to run, while `display` replaces them with
 * `<redacted>`.
 *
 * @stability unstable
 * @since 4.1.0
 */
import * as Data from "../Data.ts"
import * as Redacted from "../Redacted.ts"
import * as Result from "../Result.ts"

/**
 * Command line syntax understood by the functions in this module.
 *
 * **Details**
 *
 * - `"posix"`: POSIX shells (`sh`, `dash`, `bash`, `zsh`). Quoted words are
 *   also safe in `fish`.
 * - `"powershell"`: PowerShell 7.3 or later, which passes arguments to native
 *   programs unchanged (`$PSNativeCommandArgumentPassing` set to `Standard` or
 *   `Windows`).
 * - `"windows"`: the Microsoft C runtime convention, also implemented by
 *   `CommandLineToArgvW`, that most Windows programs use. It is not the syntax
 *   of `cmd.exe` or of batch files.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Format = "posix" | "powershell" | "windows"

/**
 * Command line syntax that {@link split} can parse.
 *
 * **Details**
 *
 * PowerShell is not included because it parses a command line into PowerShell
 * values, not into a list of strings.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type SplitFormat = "posix" | "windows"

/**
 * One argument: a plain string or a `Redacted` string that must not appear in
 * logs.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type Word = string | Redacted.Redacted<string>

/**
 * Options for {@link quote}, {@link join} and {@link display}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface Options {
  /**
   * Syntax of the program that will parse the command line.
   *
   * @default "posix"
   */
  readonly format?: Format | undefined
}

/**
 * Options for {@link split}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export interface SplitOptions {
  /**
   * Syntax of the command line being split.
   *
   * @default "posix"
   */
  readonly format?: SplitFormat | undefined
}

/**
 * Single value accepted inside a `${}` interpolation of {@link template}.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type TemplateExpressionItem = string | number | boolean | Redacted.Redacted<string>

/**
 * Value accepted inside a `${}` interpolation of {@link template}.
 *
 * **Details**
 *
 * An array adds one argument per element and must stand alone as a whole
 * argument. An empty array adds no arguments.
 *
 * @stability unstable
 * @category models
 * @since 4.1.0
 */
export type TemplateExpression = TemplateExpressionItem | ReadonlyArray<TemplateExpressionItem>

/**
 * Error returned when a command line cannot be built or split.
 *
 * **Details**
 *
 * - `NulCharacter`: an argument or command line contains a NUL character,
 *   which no command line can carry.
 * - `InvalidArgument`: the format cannot carry an argument: a Windows program
 *   name with a double quote, or the argument `--%`, which PowerShell drops
 *   when it calls a native program.
 * - `InvalidEscape`: a template contains an invalid JavaScript escape
 *   sequence, or a backslash that escapes nothing.
 * - `UnterminatedQuote`: a quoted section is not closed.
 * - `UnsupportedSyntax`: the text contains shell syntax that splitting cannot
 *   reproduce without running a shell, such as operators, expansions, globs,
 *   comments or variable assignments.
 *
 * `offset` is the position in the input of `split` where the problem starts.
 * Messages never include the input, which may contain secrets.
 *
 * @stability unstable
 * @category errors
 * @since 4.1.0
 */
export class CommandLineError extends Data.TaggedError("CommandLineError")<{
  readonly reason: "NulCharacter" | "InvalidArgument" | "InvalidEscape" | "UnterminatedQuote" | "UnsupportedSyntax"
  readonly message: string
  readonly offset?: number | undefined
}> {}

/**
 * Quotes one argument so that a program reading the given format sees it as
 * exactly one argument.
 *
 * **When to use**
 *
 * Use when you insert an argument into a command line that is otherwise
 * written by hand, for example a script passed to `sh -c`.
 *
 * **Details**
 *
 * - `"posix"` leaves words made of letters, digits and `_ @ + : , . / -`
 *   unchanged and wraps everything else in single quotes. Single quotes and
 *   backslashes are written outside the quotes, so `fish` reads the result
 *   the same way.
 * - `"powershell"` always uses single quotes, doubling `'` and the
 *   typographic single quotes that PowerShell also accepts as quotes.
 * - `"windows"` quotes words that contain a space, a tab, a line break or a
 *   double quote, using the C runtime backslash rules. Use {@link join} for a
 *   complete command line, because the program name follows different rules.
 *
 * **Gotchas**
 *
 * - The result contains the value of a `Redacted` argument. Use
 *   {@link display} for logs.
 * - Control characters are kept as they are. That is safe for `sh -c` and SSH
 *   commands, but not for text typed into an interactive shell.
 *
 * **Example** (Quoting arguments for different shells)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { CommandLine } from "effect/process"
 *
 * CommandLine.quote("it's") // => Result.succeed("'it'\\''s'")
 * CommandLine.quote("it's", { format: "powershell" }) // => Result.succeed("'it''s'")
 * CommandLine.quote("C:\\My Files\\", { format: "windows" }) // => Result.succeed("\"C:\\My Files\\\\\"")
 * ```
 *
 * @see {@link join} for quoting a whole argument list
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const quote = (word: Word, options?: Options): Result.Result<string, CommandLineError> => {
  const value = unwrap(word)
  if (value.includes("\0")) return failNul("The argument")
  switch (options?.format ?? "posix") {
    case "posix":
      return Result.succeed(quotePosix(value))
    case "powershell":
      return Result.succeed(quotePowerShell(value))
    case "windows":
      return Result.succeed(quoteWindowsArgument(value))
  }
}

/**
 * Builds a command line that runs the given program and arguments.
 *
 * **When to use**
 *
 * Use when a transport accepts only one string, such as an SSH exec request or
 * a `shell` option, and the arguments must reach the program unchanged.
 *
 * **Details**
 *
 * The first word is the program. Each word is quoted as in {@link quote} and
 * the words are separated by spaces.
 *
 * - `"powershell"` starts the line with the call operator `&`, because a
 *   quoted program name is otherwise read as a string value.
 * - `"windows"` quotes the program name with the C runtime rules for program
 *   names, which do not support backslash escapes.
 * - An empty list returns an empty string.
 *
 * **Gotchas**
 *
 * - The result contains the values of `Redacted` arguments. Use
 *   {@link display} for logs.
 * - A Windows program name that contains `"` fails with `InvalidArgument`.
 * - For `"powershell"`, an argument equal to `--%` fails with
 *   `InvalidArgument`: PowerShell drops it when it calls a native program,
 *   however it is quoted.
 *
 * **Example** (Joining arguments into command lines)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { CommandLine } from "effect/process"
 *
 * const args = ["git", "commit", "-m", "fix: don't fail"]
 *
 * CommandLine.join(args) // => Result.succeed("git commit -m 'fix: don'\\''t fail'")
 * CommandLine.join(args, { format: "powershell" }) // => Result.succeed("& 'git' 'commit' '-m' 'fix: don''t fail'")
 * CommandLine.join(args, { format: "windows" }) // => Result.succeed("git commit -m \"fix: don't fail\"")
 * ```
 *
 * @see {@link split} for the inverse operation
 * @see {@link display} for rendering a command for logs and error messages
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const join = (
  words: ReadonlyArray<Word>,
  options?: Options
): Result.Result<string, CommandLineError> => {
  const values: Array<string> = []
  for (let i = 0; i < words.length; i++) {
    const value = unwrap(words[i])
    if (value.includes("\0")) return failNul(`Argument ${i}`)
    values.push(value)
  }
  if (values.length === 0) return Result.succeed("")
  switch (options?.format ?? "posix") {
    case "posix":
      return Result.succeed(values.map(quotePosix).join(" "))
    case "powershell": {
      const stopParsing = values.indexOf("--%", 1)
      if (stopParsing !== -1) {
        return Result.fail(
          new CommandLineError({
            reason: "InvalidArgument",
            message: `Argument ${stopParsing} is "--%", which PowerShell drops when it calls a program`
          })
        )
      }
      return Result.succeed(`& ${values.map(quotePowerShell).join(" ")}`)
    }
    case "windows": {
      const program = values[0]
      if (program.includes("\"")) {
        return Result.fail(
          new CommandLineError({
            reason: "InvalidArgument",
            message: "A Windows program name cannot contain a double quote"
          })
        )
      }
      return Result.succeed([quoteWindowsProgram(program), ...values.slice(1).map(quoteWindowsArgument)].join(" "))
    }
  }
}

/**
 * Renders a command for logs and error messages.
 *
 * **When to use**
 *
 * Use when you show a command to a person, for example in an error message,
 * and secrets and control characters must not reach the output.
 *
 * **Details**
 *
 * - Quotes like {@link join}, so commands without control characters or
 *   secrets can be copied into a terminal of the given format.
 * - Replaces `Redacted` arguments with `<redacted>`.
 * - Writes control characters and Unicode line separators as escapes such as
 *   `\n` or `\u001b`, so output cannot move the cursor or inject terminal
 *   sequences.
 * - Never fails: input that {@link join} rejects is rendered anyway.
 *
 * **Gotchas**
 *
 * The output is for reading only. It is not a reliable command line: escapes
 * and `<redacted>` change what a shell would run.
 *
 * **Example** (Showing a command with a secret)
 *
 * ```ts import.meta.vitest
 * import { Redacted } from "effect"
 * import { CommandLine } from "effect/process"
 *
 * const token = Redacted.make("hunter2")
 *
 * CommandLine.display(["curl", "-H", token, "https://x.dev/a b"]) // => "curl -H <redacted> 'https://x.dev/a b'"
 * ```
 *
 * @see {@link join} for building a command line to run
 *
 * @stability unstable
 * @category encoding
 * @since 4.1.0
 */
export const display = (words: ReadonlyArray<Word>, options?: Options): string => {
  if (words.length === 0) return ""
  const format = options?.format ?? "posix"
  // Escaping after quoting keeps the escapes inside the quotes.
  const rendered = words.map((word, i) => {
    if (Redacted.isRedacted(word)) return "<redacted>"
    switch (format) {
      case "posix":
        return escapeControlCharacters(quotePosix(word))
      case "powershell":
        return escapeControlCharacters(quotePowerShell(word))
      case "windows":
        return escapeControlCharacters(
          i === 0 && !word.includes("\"") ? quoteWindowsProgram(word) : quoteWindowsArgument(word)
        )
    }
  })
  return format === "powershell" ? `& ${rendered.join(" ")}` : rendered.join(" ")
}

/**
 * Splits a command line into arguments, without running a shell.
 *
 * **When to use**
 *
 * Use when a command arrives as text, such as an `EDITOR` setting or a
 * configuration value, and must run as a program with arguments.
 *
 * **Details**
 *
 * `"posix"` removes quotes and backslash escapes as a POSIX shell does, and
 * fails with `UnsupportedSyntax` for anything that would need a shell to run:
 *
 * - operators and line breaks (`| & ; < > ( )`), which build more than one
 *   command;
 * - expansions (`$NAME`, `${...}`, `$(...)`, backticks, a leading `~`, braces
 *   such as `{a,b}`, and a leading `=` that `zsh` expands);
 * - globs (`* ? [`) and comments (`#` at the start of a word);
 * - a variable assignment or a reserved word such as `if` in the program
 *   position.
 *
 * Quote such characters to pass them literally, or run the text with a shell.
 *
 * `"windows"` follows the documented C runtime rules: spaces and tabs separate
 * arguments, double quotes group, `""` inside quotes is a literal quote, and
 * backslashes escape only the double quotes that follow them. The program
 * name, the first argument, does not use backslash escapes. Leading
 * whitespace is ignored.
 *
 * **Gotchas**
 *
 * An unclosed quote fails with `UnterminatedQuote` for `"posix"`, but ends
 * the argument for `"windows"`, as Windows programs do.
 *
 * **Example** (Splitting configured commands)
 *
 * ```ts import.meta.vitest
 * import { Result } from "effect"
 * import { CommandLine } from "effect/process"
 *
 * CommandLine.split("code --wait 'my notes.txt'") // => Result.succeed(["code", "--wait", "my notes.txt"])
 * const line = "\"C:\\Program Files\\Code\\code.exe\" --wait"
 * CommandLine.split(line, { format: "windows" }) // => Result.succeed(["C:\\Program Files\\Code\\code.exe", "--wait"])
 *
 * Result.isFailure(CommandLine.split("cat notes.txt | less")) // => true
 * ```
 *
 * @see {@link join} for the inverse operation
 *
 * @stability unstable
 * @category decoding
 * @since 4.1.0
 */
export const split = (
  line: string,
  options?: SplitOptions
): Result.Result<Array<string>, CommandLineError> => {
  const nul = line.indexOf("\0")
  if (nul !== -1) return failNul("The command line", nul)
  if ((options?.format ?? "posix") === "windows") return Result.succeed(splitWindows(line))
  const scanner = new PosixScanner(false)
  const result = scanner.text(line, 0, false)
  if (result !== undefined) return Result.fail(result)
  const end = scanner.end(line.length, 0)
  if (end !== undefined) return Result.fail(end)
  return Result.succeed(scanner.words as Array<string>)
}

/**
 * Builds an argument list from a template literal.
 *
 * **When to use**
 *
 * Use to write a command as it would look in a shell while keeping every
 * interpolated value a literal argument.
 *
 * **Details**
 *
 * - The template text is split with the `"posix"` rules of {@link split}, so
 *   quotes group words and unsupported shell syntax fails. Line breaks in the
 *   text separate arguments, so a long command can span several lines.
 * - Each `${}` value is inserted literally, without splitting or quote
 *   processing. Next to other text or inside quotes, it becomes part of the
 *   surrounding argument.
 * - An array adds one argument per element and must stand alone as a whole
 *   argument.
 * - Numbers and booleans are converted with `String`.
 * - An argument that contains a `Redacted` value becomes `Redacted` as a
 *   whole.
 *
 * **Gotchas**
 *
 * An invalid JavaScript escape sequence in the text, such as `\u` without hex
 * digits, fails with `InvalidEscape`. Use `String.raw` or a `${}` value for
 * backslashes.
 *
 * **Example** (Building arguments with interpolated values)
 *
 * ```ts import.meta.vitest
 * import { Redacted, Result } from "effect"
 * import { CommandLine } from "effect/process"
 *
 * const msg = "fix: handle $HOME"
 * const files = ["a.ts", "b.ts"]
 *
 * CommandLine.template`git commit -m ${msg} ${files}` // => Result.succeed(["git", "commit", "-m", msg, ...files])
 *
 * const password = Redacted.make("hunter2")
 * const words = Result.getOrThrow(CommandLine.template`psql "--password=${password}"`)
 *
 * CommandLine.display(words) // => "psql <redacted>"
 * ```
 *
 * @see {@link split} for splitting text that is not a template
 *
 * @stability unstable
 * @category constructors
 * @since 4.1.0
 */
export const template = (
  strings: TemplateStringsArray,
  ...expressions: ReadonlyArray<TemplateExpression>
): Result.Result<Array<Word>, CommandLineError> => {
  const scanner = new PosixScanner(true)
  for (let i = 0; i < strings.length; i++) {
    const text = strings[i]
    if (text === undefined) {
      return Result.fail(
        new CommandLineError({
          reason: "InvalidEscape",
          message: `Template part ${i} contains an invalid escape sequence`
        })
      )
    }
    const isLast = i === expressions.length
    const textError = scanner.text(text, i, !isLast)
    if (textError !== undefined) return Result.fail(textError)
    if (isLast) break
    const valueError = scanner.value(expressions[i], i)
    if (valueError !== undefined) return Result.fail(valueError)
  }
  const end = scanner.end(0, strings.length - 1)
  if (end !== undefined) return Result.fail(end)
  return Result.succeed(scanner.words)
}

// -----------------------------------------------------------------------------
// Quoting
// -----------------------------------------------------------------------------

const unwrap = (word: Word): string => typeof word === "string" ? word : Redacted.value(word)

const unwrapItem = (item: TemplateExpressionItem): string =>
  Redacted.isRedacted(item) ? Redacted.value(item as Redacted.Redacted<string>) : String(item)

const failNul = (subject: string, offset?: number): Result.Result<never, CommandLineError> =>
  Result.fail(
    new CommandLineError({
      reason: "NulCharacter",
      message: offset === undefined
        ? `${subject} contains a NUL character`
        : `${subject} contains a NUL character at offset ${offset}`,
      offset
    })
  )

const posixSafe = /^[A-Za-z0-9_@+:,./-]+$/

// Single quotes keep every character literal in POSIX shells. `'` and `\` are
// written outside the quotes, because fish also treats `\'` and `\\` as
// escapes inside single quotes.
const quotePosix = (value: string): string =>
  posixSafe.test(value) ? value : `'${value.replace(/['\\]/g, (char) => `'\\${char}'`)}'`

// PowerShell also reads the typographic single quotes U+2018 to U+201B as
// quotes, so each of them is doubled like `'`.
const quotePowerShell = (value: string): string => `'${value.replace(/['\u2018\u2019\u201A\u201B]/g, "$&$&")}'`

const windowsNeedsQuotes = /[ \t\n\v"]/

// Arguments: 2n backslashes before a quote mean n backslashes, 2n+1 mean n
// backslashes and a literal quote, and other backslashes are literal.
const quoteWindowsArgument = (value: string): string => {
  if (value.length > 0 && !windowsNeedsQuotes.test(value)) return value
  let out = "\""
  let backslashes = 0
  for (const char of value) {
    if (char === "\\") {
      backslashes++
    } else if (char === "\"") {
      out += "\\".repeat(backslashes * 2 + 1) + "\""
      backslashes = 0
    } else {
      out += "\\".repeat(backslashes) + char
      backslashes = 0
    }
  }
  return out + "\\".repeat(backslashes * 2) + "\""
}

// Program names allow quotes for grouping but no backslash escapes.
const quoteWindowsProgram = (value: string): string => value.length > 0 && !/[ \t]/.test(value) ? value : `"${value}"`

// oxlint-disable-next-line no-control-regex
const controlCharacters = /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g

const controlEscapes: Record<string, string> = { "\n": "\\n", "\r": "\\r", "\t": "\\t" }

const escapeControlCharacters = (value: string): string =>
  value.replace(
    controlCharacters,
    (char) => controlEscapes[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
  )

// -----------------------------------------------------------------------------
// Splitting
// -----------------------------------------------------------------------------

const isWindowsSpace = (char: string | undefined): boolean => char === " " || char === "\t"

const splitWindows = (line: string): Array<string> => {
  const args: Array<string> = []
  const length = line.length
  let i = 0
  while (isWindowsSpace(line[i])) i++
  if (i >= length) return args

  let program = ""
  let inQuotes = false
  for (; i < length; i++) {
    const char = line[i]
    if (char === "\"") inQuotes = !inQuotes
    else if (!inQuotes && isWindowsSpace(char)) break
    else program += char
  }
  args.push(program)

  while (true) {
    while (isWindowsSpace(line[i])) i++
    if (i >= length) return args
    let arg = ""
    inQuotes = false
    while (i < length) {
      const char = line[i]
      if (char === "\\") {
        let count = 0
        while (line[i] === "\\") {
          count++
          i++
        }
        if (line[i] === "\"") {
          arg += "\\".repeat(count >> 1)
          if (count % 2 === 1) {
            arg += "\""
            i++
          }
        } else {
          arg += "\\".repeat(count)
        }
      } else if (char === "\"") {
        if (inQuotes && line[i + 1] === "\"") {
          arg += "\""
          i += 2
        } else {
          inQuotes = !inQuotes
          i++
        }
      } else if (!inQuotes && isWindowsSpace(char)) {
        break
      } else {
        arg += char
        i++
      }
    }
    args.push(arg)
  }
}

// POSIX reserved words that start or continue a compound command.
const reservedWords = new Set([
  "!",
  "{",
  "}",
  "case",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "fi",
  "for",
  "if",
  "then",
  "until",
  "while"
])

const operators = "|&;<>()"
const globs = "*?["
const expansionStart = /[A-Za-z_0-9{(@*#?$!'"-]/
const quotedExpansionStart = /[A-Za-z_0-9{(@*#?$!-]/
const assignmentName = /^[A-Za-z_][A-Za-z0-9_]*$/

// Splits text with POSIX quote removal. A template feeds it text parts and
// interpolated values in turn; `split` feeds it a single text part.
class PosixScanner {
  readonly words: Array<Word> = []
  private quote: "none" | "single" | "double" = "none"
  private quoteStart = 0
  private quoteLocation = ""
  private inWord = false
  private chunks: Array<string> = []
  private secret = false
  // The Redacted value when the word consists of it alone, kept as is.
  private redacted: Redacted.Redacted<string> | undefined = undefined
  // The word so far is unquoted literal text, so it can be a reserved word or
  // the name of a variable assignment.
  private plain = true
  private braceDepth = 0
  private afterArray = false

  private readonly isTemplate: boolean

  constructor(isTemplate: boolean) {
    this.isTemplate = isTemplate
  }

  private where(offset: number, part: number): string {
    return this.isTemplate ? ` in template part ${part}` : ` at offset ${offset}`
  }

  private error(
    reason: CommandLineError["reason"],
    message: string,
    offset: number,
    part: number
  ): CommandLineError {
    return new CommandLineError({
      reason,
      message: `${message}${this.where(offset, part)}`,
      offset: this.isTemplate ? undefined : offset
    })
  }

  private append(text: string): void {
    this.chunks.push(text)
    this.inWord = true
  }

  private endWord(offset: number, part: number): CommandLineError | undefined {
    if (!this.inWord) return undefined
    const value = this.chunks.join("")
    if (this.words.length === 0 && this.plain && reservedWords.has(value)) {
      return this.error("UnsupportedSyntax", `The reserved word "${value}" needs a shell`, offset, part)
    }
    this.words.push(
      this.redacted !== undefined && this.chunks.length === 1
        ? this.redacted
        : this.secret
        ? Redacted.make(value)
        : value
    )
    this.chunks = []
    this.inWord = false
    this.secret = false
    this.redacted = undefined
    this.plain = true
    this.braceDepth = 0
    return undefined
  }

  text(text: string, part: number, valueFollows: boolean): CommandLineError | undefined {
    if (this.afterArray) {
      this.afterArray = false
      const next = text[0]
      if (next === undefined ? valueFollows : !(next === " " || next === "\t" || next === "\n")) {
        return this.error("UnsupportedSyntax", "An interpolated array must be a separate argument", 0, part)
      }
    }
    const length = text.length
    let i = 0
    while (i < length) {
      const char = text[i]
      const next = text[i + 1]

      if (char === "\0") {
        return this.error("NulCharacter", "The text contains a NUL character", i, part)
      }

      if (this.quote === "single") {
        if (char === "'") this.quote = "none"
        else this.chunks.push(char)
        i++
        continue
      }

      if (this.quote === "double") {
        if (char === "\"") {
          this.quote = "none"
        } else if (char === "\\") {
          if (next === "\n") {
            i++
          } else if (next === "$" || next === "`" || next === "\"" || next === "\\") {
            this.chunks.push(next)
            i++
          } else {
            this.chunks.push(char)
          }
        } else if (char === "$" && next !== undefined && quotedExpansionStart.test(next)) {
          return this.error("UnsupportedSyntax", `The expansion "$${next}" needs a shell`, i, part)
        } else if (char === "`") {
          return this.error("UnsupportedSyntax", "Command substitution needs a shell", i, part)
        } else {
          this.chunks.push(char)
        }
        i++
        continue
      }

      if (char === " " || char === "\t" || (char === "\n" && this.isTemplate)) {
        const error = this.endWord(i, part)
        if (error !== undefined) return error
        i++
        continue
      }
      if (char === "\n") {
        return this.error("UnsupportedSyntax", "A line break separates shell commands", i, part)
      }
      if (char === "\\") {
        if (next === undefined) {
          return this.error("InvalidEscape", "A trailing backslash escapes nothing", i, part)
        }
        if (next !== "\n") {
          this.append(next)
          this.plain = false
        }
        i += 2
        continue
      }
      if (char === "'" || char === "\"") {
        this.quote = char === "'" ? "single" : "double"
        this.quoteStart = i
        this.quoteLocation = this.where(i, part)
        this.inWord = true
        this.plain = false
        i++
        continue
      }
      if (operators.includes(char)) {
        return this.error("UnsupportedSyntax", `The operator "${char}" needs a shell`, i, part)
      }
      if (char === "`") {
        return this.error("UnsupportedSyntax", "Command substitution needs a shell", i, part)
      }
      if (char === "$" && next !== undefined && expansionStart.test(next)) {
        return this.error("UnsupportedSyntax", `The expansion "$${next}" needs a shell`, i, part)
      }
      if (globs.includes(char)) {
        return this.error("UnsupportedSyntax", `The glob character "${char}" needs a shell`, i, part)
      }
      if (!this.inWord) {
        if (char === "#") {
          return this.error("UnsupportedSyntax", "A comment needs a shell", i, part)
        }
        if (char === "~") {
          return this.error("UnsupportedSyntax", "Tilde expansion needs a shell", i, part)
        }
        if (char === "=" && next !== undefined && next !== " " && next !== "\t" && next !== "\n") {
          return this.error("UnsupportedSyntax", "A leading \"=\" is expanded by zsh", i, part)
        }
      }
      if (char === "{") {
        this.braceDepth++
      } else if (char === "}") {
        if (this.braceDepth > 0) this.braceDepth--
      } else if (this.braceDepth > 0 && (char === "," || (char === "." && next === "."))) {
        return this.error("UnsupportedSyntax", "Brace expansion needs a shell", i, part)
      } else if (
        char === "=" && this.words.length === 0 && this.plain && assignmentName.test(this.chunks.join(""))
      ) {
        return this.error("UnsupportedSyntax", "A variable assignment needs a shell", i, part)
      }
      this.append(char)
      i++
    }
    return undefined
  }

  value(expression: TemplateExpression, part: number): CommandLineError | undefined {
    if (Array.isArray(expression)) {
      if (this.inWord || this.quote !== "none") {
        return this.error("UnsupportedSyntax", "An interpolated array must be a separate argument", 0, part)
      }
      for (const item of expression as ReadonlyArray<TemplateExpressionItem>) {
        if (unwrapItem(item).includes("\0")) return this.nulValue(part)
        this.words.push(Redacted.isRedacted(item) ? item as Redacted.Redacted<string> : String(item))
      }
      this.afterArray = true
      return undefined
    }
    const item = expression as TemplateExpressionItem
    const value = unwrapItem(item)
    if (value.includes("\0")) return this.nulValue(part)
    if (Redacted.isRedacted(item)) {
      this.secret = true
      if (this.chunks.length === 0) this.redacted = item as Redacted.Redacted<string>
    }
    this.append(value)
    this.plain = false
    return undefined
  }

  private nulValue(part: number): CommandLineError {
    return new CommandLineError({
      reason: "NulCharacter",
      message: `Template value ${part} contains a NUL character`
    })
  }

  end(offset: number, part: number): CommandLineError | undefined {
    if (this.quote !== "none") {
      return new CommandLineError({
        reason: "UnterminatedQuote",
        message: `The quote${this.quoteLocation} is not closed`,
        offset: this.isTemplate ? undefined : this.quoteStart
      })
    }
    return this.endWord(offset, part)
  }
}

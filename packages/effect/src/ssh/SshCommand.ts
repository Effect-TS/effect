/**
 * Commands to run on an SSH server.
 *
 * An `SshCommand` describes a command, its arguments, and how to run it, and
 * `SshConnection.exec` and `SshConnection.run` run it in a session. Commands
 * are built like `ChildProcess` commands, from a template literal or from a
 * command and arguments, and `pipeTo` connects them into a pipeline that runs
 * on the server.
 *
 * **Example** (Building commands)
 *
 * ```ts import.meta.vitest
 * import { SshCommand } from "effect/ssh"
 *
 * const dir = "/srv/my app"
 * const pull = SshCommand.make`git -C ${dir} pull --ff-only`
 * const restart = SshCommand.make("systemctl", ["restart", "app"])
 * const errors = SshCommand.make({ cwd: "/var/log" })`grep -c error app.log`.pipe(
 *   SshCommand.pipeTo(SshCommand.make("cat"))
 * )
 *
 * const args = pull.args // => ["-C", "/srv/my app", "pull", "--ff-only"]
 * ```
 *
 * @stability experimental
 * @since 4.0.0
 */
import { IllegalArgumentError } from "../Cause.ts"
import { dual } from "../Function.ts"
import { type Pipeable, pipeArguments } from "../Pipeable.ts"
import * as Predicate from "../Predicate.ts"
import * as ChildProcess from "../process/ChildProcess.ts"

const TypeId = "~effect/ssh/SshCommand"

/**
 * A command to run on an SSH server: a single command, or a pipeline.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export type SshCommand = StandardCommand | PipedCommand

/**
 * A command with its arguments.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface StandardCommand extends Pipeable {
  readonly [TypeId]: typeof TypeId
  readonly _tag: "StandardCommand"
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly options: Options
}

/**
 * A pipeline: the standard output of `left` is the standard input of
 * `right`.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface PipedCommand extends Pipeable {
  readonly [TypeId]: typeof TypeId
  readonly _tag: "PipedCommand"
  readonly left: SshCommand
  readonly right: SshCommand
}

/**
 * How to run a command.
 *
 * **Details**
 *
 * - `cwd` runs the command in a directory, with a `cd` before it; a missing
 *   directory makes the command exit with a non-zero status without running
 *   it. Relative directories, and those starting with `~/`, are relative to
 *   the remote home directory.
 * - `env` sets environment variables for the command, with `export`; the
 *   rest of the remote environment is kept. Names must be valid shell
 *   variable names, such as `NODE_ENV`, and a variable the shell cannot set,
 *   such as a read-only one, makes the command exit without running it.
 * - `shell` passes the command and arguments to a shell unquoted: `true`
 *   uses the remote login shell, and a string names another shell, run with
 *   `-c`. Values interpolated into a template are not quoted either. Without
 *   `shell`, the command replaces the shell with `exec`, so it must be a
 *   program rather than a shell builtin or function.
 *
 * @stability experimental
 * @category models
 * @since 4.0.0
 */
export interface Options {
  readonly cwd?: string | undefined
  readonly env?: Readonly<Record<string, string>> | undefined
  readonly shell?: boolean | string | undefined
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeStandard = (command: string, args: ReadonlyArray<string>, options: Options): StandardCommand =>
  Object.assign(Object.create(Proto), { _tag: "StandardCommand", command, args, options })

const fromTemplate = (
  templates: TemplateStringsArray,
  expressions: ReadonlyArray<ChildProcess.TemplateExpression>,
  options: Options
): StandardCommand => {
  if (options.shell !== undefined && options.shell !== false) {
    // Shell code is kept as written, so its quotes, newlines, and comments
    // survive.
    let code = ""
    for (const [index, template] of templates.entries()) {
      if (template === undefined) {
        throw new IllegalArgumentError(`invalid escape sequence in ${JSON.stringify(templates.raw[index])}`)
      }
      code += template
      if (index < expressions.length) {
        const expression = expressions[index]
        code += Array.isArray(expression) ? expression.join(" ") : String(expression)
      }
    }
    return makeStandard(code, [], options)
  }
  // Templates are split into arguments like `ChildProcess` templates.
  const parsed = ChildProcess.make(templates, ...expressions)
  return makeStandard(parsed.command, parsed.args, options)
}

/**
 * Checks whether a value is an `SshCommand`.
 *
 * @stability experimental
 * @category guards
 * @since 4.0.0
 */
export const isSshCommand = (u: unknown): u is SshCommand => Predicate.hasProperty(u, TypeId)

/**
 * Creates a command from a template literal, options and a template literal,
 * or a command with arguments.
 *
 * **Details**
 *
 * Templates are split into arguments at whitespace, like `ChildProcess`
 * templates: an interpolated value is a single argument however many spaces
 * it contains, and an interpolated array is one argument per element.
 * Arguments are quoted for the remote shell unless `shell` is set. With
 * `shell`, a template is shell code kept as written, including its quotes,
 * newlines, and comments, and interpolated values are inserted unquoted, with
 * the elements of arrays separated by spaces.
 *
 * **Example** (Creating commands)
 *
 * ```ts import.meta.vitest
 * import { SshCommand } from "effect/ssh"
 *
 * const file = "my notes.txt"
 * const fromTemplate = SshCommand.make`wc -l ${file}`
 * const withOptions = SshCommand.make({ cwd: "/tmp" })`ls -la`
 * const fromArgs = SshCommand.make("git", ["status"])
 *
 * const args = fromTemplate.args // => ["-l", "my notes.txt"]
 * ```
 *
 * @stability experimental
 * @category constructors
 * @since 4.0.0
 */
export const make: {
  (templates: TemplateStringsArray, ...expressions: ReadonlyArray<ChildProcess.TemplateExpression>): StandardCommand
  (
    options: Options
  ): (
    templates: TemplateStringsArray,
    ...expressions: ReadonlyArray<ChildProcess.TemplateExpression>
  ) => StandardCommand
  (command: string, options?: Options): StandardCommand
  (command: string, args: ReadonlyArray<string>, options?: Options): StandardCommand
} = function make(...args: Array<unknown>): any {
  if (Array.isArray(args[0]) && "raw" in args[0]) {
    const [templates, ...expressions] = args as [TemplateStringsArray, ...Array<ChildProcess.TemplateExpression>]
    return fromTemplate(templates, expressions, {})
  }
  if (typeof args[0] === "object") {
    const options = args[0] as Options
    return (templates: TemplateStringsArray, ...expressions: ReadonlyArray<ChildProcess.TemplateExpression>) =>
      fromTemplate(templates, expressions, options)
  }
  if (!Array.isArray(args[1])) {
    const [command, options = {}] = args as [string, Options?]
    return makeStandard(command, [], options)
  }
  const [command, commandArgs, options = {}] = args as [string, ReadonlyArray<string>, Options?]
  return makeStandard(command, commandArgs, options)
}

/**
 * Pipes the standard output of a command into another command, as a
 * pipeline that runs on the server.
 *
 * @stability experimental
 * @category combinators
 * @since 4.0.0
 */
export const pipeTo: {
  (that: SshCommand): (self: SshCommand) => PipedCommand
  (self: SshCommand, that: SshCommand): PipedCommand
} = dual(
  2,
  (self: SshCommand, that: SshCommand): PipedCommand =>
    Object.assign(Object.create(Proto), { _tag: "PipedCommand", left: self, right: that })
)

/**
 * Quotes a string for POSIX shells.
 *
 * **Details**
 *
 * Quotes and backslashes are escaped outside the single quotes, so fish
 * reads the result the same way. Words with `=` are quoted, because zsh
 * expands a leading `=` to the path of a command, and words with `%`,
 * because fish expands `%self` to its process id.
 */
const quote = (value: string): string =>
  value.length > 0 && /^[A-Za-z0-9_@+:,./-]+$/.test(value)
    ? value
    : `'${value.replace(/['\\]/g, (char) => `'\\${char}'`)}'`

/**
 * Quotes a directory for `cd`. A leading `~/` stays unquoted, so it names
 * the home directory, and other relative directories get a `./` prefix
 * unless they start with `.` or `..` as a whole component, so `cd` reads
 * none as an option and none is looked up in `CDPATH`.
 */
const directory = (path: string): string => {
  if (path === "~") return path
  if (path.startsWith("~/")) return `~/${quote(path.slice(2))}`
  return quote(path.startsWith("/") || /^\.\.?(\/|$)/.test(path) ? path : `./${path}`)
}

/** Builds the command line for a single command; see `Options`. */
const line = (command: StandardCommand): string => {
  const { args, options } = command
  const parts: Array<string> = []
  // `exit` keeps the rest of the line, even shell code with `||`, from
  // running elsewhere.
  if (options.cwd !== undefined) parts.push(`cd ${directory(options.cwd)} || exit;`)
  const env = Object.entries(options.env ?? {})
  for (const [name] of env) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new IllegalArgumentError(`invalid environment variable name: ${JSON.stringify(name)}`)
    }
  }
  if (env.length > 0) {
    parts.push(`export ${env.map(([name, value]) => quote(`${name}=${value}`)).join(" ")} || exit;`)
  }
  const shell = options.shell
  if (shell === true) {
    parts.push([command.command, ...args].join(" "))
  } else if (typeof shell === "string") {
    parts.push(`exec ${quote(shell)} -c ${quote([command.command, ...args].join(" "))}`)
  } else {
    parts.push(`exec ${[command.command, ...args].map(quote).join(" ")}`)
  }
  return parts.join(" ")
}

/**
 * Renders a command as the command line sent to the server's login shell.
 *
 * **Details**
 *
 * Arguments are quoted for POSIX shells unless `shell` is set, `cwd` becomes
 * a `cd` before the command, and `env` an `export`. Each part of a pipeline
 * runs in its own subshell, so its directory and environment stay its own.
 *
 * Single commands also work with fish as the login shell, but pipelines
 * need a POSIX-compatible login shell, such as `sh`, `bash`, or `zsh`.
 *
 * Throws an `IllegalArgumentError` when an `env` name is not a valid shell
 * variable name, or when the command line would contain a NUL character,
 * which servers cannot receive.
 *
 * **Example** (Rendering a command line)
 *
 * ```ts import.meta.vitest
 * import { SshCommand } from "effect/ssh"
 *
 * const line = SshCommand.render(SshCommand.make({ cwd: "/srv/my app" })`ls -la`) // => "cd '/srv/my app' || exit; exec ls -la"
 * ```
 *
 * @stability experimental
 * @category utility
 * @since 4.0.0
 */
export const render = (command: SshCommand): string => {
  const rendered = command._tag === "StandardCommand" ? line(command) : pipeline(command)
  // OpenSSH servers drop the whole connection on a command line with NUL.
  if (rendered.includes("\0")) throw new IllegalArgumentError("the command line contains a NUL character")
  return rendered
}

const pipeline = (command: PipedCommand): string => {
  const parts: Array<string> = []
  const visit = (current: SshCommand) => {
    if (current._tag === "StandardCommand") {
      // The newline ends a trailing comment in shell code.
      parts.push(`(${line(current)}\n)`)
    } else {
      visit(current.left)
      visit(current.right)
    }
  }
  visit(command)
  return parts.join(" | ")
}

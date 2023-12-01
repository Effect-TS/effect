/**
 * @since 1.0.0
 */
import type { Effect } from "effect/Effect"
import type { HashMap } from "effect/HashMap"
import type { Option } from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import type { NonEmptyReadonlyArray } from "effect/ReadonlyArray"
import type { Scope } from "effect/Scope"
import type { Sink } from "effect/Sink"
import type { Stream } from "effect/Stream"
import type { CommandExecutor, ExitCode, Process } from "./CommandExecutor.js"
import type { PlatformError } from "./Error.js"
import * as internal from "./internal/command.js"

/**
 * @since 1.0.0
 */
export const CommandTypeId: unique symbol = internal.CommandTypeId

/**
 * @since 1.0.0
 */
export type CommandTypeId = typeof CommandTypeId

/**
 * @since 1.0.0
 * @category models
 */
export type Command = StandardCommand | PipedCommand

/**
 * @since 1.0.0
 */
export declare namespace Command {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto {
    readonly [CommandTypeId]: CommandTypeId
  }
  /**
   * Configures the pipe that is established between the parent and child
   * processes' `stdin` stream.
   *
   * @since 1.0.0
   * @category models
   */
  export type Input = CommandInput
  /**
   * Configures the pipes that are established between the parent and child
   * processes `stderr` and `stdout` streams.
   *
   * @since 1.0.0
   * @category models
   */
  export type Output = CommandOutput
}

/**
 * Configures the pipe that is established between the parent and child
 * processes' `stdin` stream.
 *
 * @since 1.0.0
 * @category models
 */
export type CommandInput = Stream<never, PlatformError, Uint8Array>

/**
 * Configures the pipes that are established between the parent and child
 * processes `stderr` and `stdout` streams.
 *
 * @since 1.0.0
 * @category models
 */
export type CommandOutput = "inherit" | "pipe" | Sink<never, never, Uint8Array, never, Uint8Array>

/**
 * @since 1.0.0
 * @category models
 */
export interface StandardCommand extends Command.Proto, Pipeable {
  readonly _tag: "StandardCommand"
  readonly command: string
  readonly args: ReadonlyArray<string>
  readonly env: HashMap<string, string>
  readonly cwd: Option<string>
  readonly shell: boolean | string
  readonly stdin: Option<Command.Input>
  readonly stdout: Command.Output
  readonly stderr: Command.Output
  readonly gid: Option<number>
  readonly uid: Option<number>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface PipedCommand extends Command.Proto, Pipeable {
  readonly _tag: "PipedCommand"
  readonly left: Command
  readonly right: Command
}

/**
 * Returns `true` if the specified value is a `Command`, otherwise returns
 * `false`.
 *
 * @since 1.0.0
 * @category refinements
 */
export const isCommand: (u: unknown) => u is Command = internal.isCommand

/**
 * Specify the environment variables that will be used when running this command.
 *
 * @since 1.0.0
 * @category combinators
 */
export const env: {
  (environment: Record<string, string>): (self: Command) => Command
  (self: Command, environment: Record<string, string>): Command
} = internal.env

/**
 * Returns the exit code of the command after the process has completed
 * execution.
 *
 * @since 1.0.0
 * @category execution
 */
export const exitCode: (self: Command) => Effect<CommandExecutor, PlatformError, ExitCode> = internal.exitCode

/**
 * Feed a string to standard input (default encoding of UTF-8).
 *
 * @since 1.0.0
 * @category combinators
 */
export const feed: {
  (input: string): (self: Command) => Command
  (self: Command, input: string): Command
} = internal.feed

/**
 * Flatten this command to a non-empty array of standard commands.
 *
 * * For a `StandardCommand`, this simply returns a `1` element array
 * * For a `PipedCommand`, all commands in the pipe will be extracted out into
 *   a array from left to right
 *
 * @since 1.0.0
 * @category combinators
 */
export const flatten: (self: Command) => NonEmptyReadonlyArray<StandardCommand> = internal.flatten

/**
 * Runs the command returning the output as an array of lines with the specified
 * encoding.
 *
 * @since 1.0.0
 * @category execution
 */
export const lines: (
  command: Command,
  encoding?: string
) => Effect<CommandExecutor, PlatformError, ReadonlyArray<string>> = internal.lines

/**
 * Create a command with the specified process name and an optional list of
 * arguments.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make: (command: string, ...args: Array<string>) => Command = internal.make

/**
 * Pipe one command to another command from left to right.
 *
 * Conceptually, the equivalent of piping one shell command to another:
 *
 * ```sh
 * command1 | command2
 * ```
 *
 * @since 1.0.0
 * @category combinators
 */
export const pipeTo: {
  (into: Command): (self: Command) => Command
  (self: Command, into: Command): Command
} = internal.pipeTo

/**
 * Allows for specifying whether or not a `Command` should be run inside a
 * shell.
 *
 * @since 1.0.0
 * @category combinators
 */
export const runInShell: {
  (shell: string | boolean): (self: Command) => Command
  (self: Command, shell: string | boolean): Command
} = internal.runInShell

/**
 * Start running the command and return a handle to the running process.
 *
 * @since 1.0.0
 * @category execution
 */
export const start: (command: Command) => Effect<CommandExecutor | Scope, PlatformError, Process> = internal.start

/**
 * Start running the command and return the output as a `Stream`.
 *
 * @since 1.0.0
 * @category execution
 */
export const stream: (command: Command) => Stream<CommandExecutor, PlatformError, Uint8Array> = internal.stream

/**
 * Runs the command returning the output as an stream of lines with the
 * specified encoding.
 *
 * @since 1.0.0
 * @category execution
 */
export const streamLines: (command: Command) => Stream<CommandExecutor, PlatformError, string> = internal.streamLines

/**
 * Runs the command returning the entire output as a string with the
 * specified encoding.
 *
 * If an encoding is not specified, the encoding will default to `utf-8`.
 *
 * @since 1.0.0
 * @category execution
 */
export const string: {
  (encoding?: string): (command: Command) => Effect<CommandExecutor, PlatformError, string>
  (command: Command, encoding?: string): Effect<CommandExecutor, PlatformError, string>
} = internal.string

/**
 * Specify the standard error stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export const stderr: {
  (stderr: Command.Output): (self: Command) => Command
  (self: Command, stderr: Command.Output): Command
} = internal.stderr

/**
 * Specify the standard input stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export const stdin: {
  (stdin: Command.Input): (self: Command) => Command
  (self: Command, stdin: Command.Input): Command
} = internal.stdin

/**
 * Specify the standard output stream for a command.
 *
 * @since 1.0.0
 * @category combinators
 */
export const stdout: {
  (stdout: Command.Output): (self: Command) => Command
  (self: Command, stdout: Command.Output): Command
} = internal.stdout

/**
 * Set the working directory that will be used when this command will be run.
 *
 * For piped commands, the working directory of each command will be set to the
 * specified working directory.
 *
 * @since 1.0.0
 * @category combinators
 */
export const workingDirectory: {
  (cwd: string): (self: Command) => Command
  (self: Command, cwd: string): Command
} = internal.workingDirectory

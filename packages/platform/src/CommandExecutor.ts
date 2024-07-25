/**
 * @since 1.0.0
 */
import type * as Brand from "effect/Brand"
import type { Tag } from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Inspectable } from "effect/Inspectable"
import type { Scope } from "effect/Scope"
import type { Sink } from "effect/Sink"
import type { Stream } from "effect/Stream"
import type { Command } from "./Command.js"
import type { PlatformError } from "./Error.js"
import * as internal from "./internal/commandExecutor.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = internal.TypeId

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface CommandExecutor {
  readonly [TypeId]: TypeId

  /**
   * Returns the exit code of the command after the process has completed
   * execution.
   */
  readonly exitCode: (command: Command) => Effect<ExitCode, PlatformError>
  /**
   * Start running the command and return a handle to the running process.
   */
  readonly start: (command: Command) => Effect<Process, PlatformError, Scope>
  /**
   * Runs the command returning the entire output as a string with the
   * specified encoding.
   *
   * If an encoding is not specified, the encoding will default to `utf-8`.
   */
  readonly string: (command: Command, encoding?: string) => Effect<string, PlatformError>
  /**
   * Runs the command returning the entire output as an array of lines.
   *
   * If an encoding is not specified, the encoding will default to `utf-8`.
   */
  readonly lines: (command: Command, encoding?: string) => Effect<Array<string>, PlatformError>
  /**
   * Runs the command returning the output as a `Stream`.
   */
  readonly stream: (command: Command) => Stream<Uint8Array, PlatformError>
  /**
   * Runs the command returning the output as a `Stream` of lines.
   */
  readonly streamLines: (command: Command, encoding?: string) => Stream<string, PlatformError>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const CommandExecutor: Tag<CommandExecutor, CommandExecutor> = internal.CommandExecutor

/**
 * @since 1.0.0
 * @category symbols
 */
export const ProcessTypeId: unique symbol = internal.ProcessTypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export type ProcessTypeId = typeof ProcessTypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface Process extends Inspectable {
  readonly [ProcessTypeId]: ProcessTypeId
  /**
   * The process identifier.
   */
  readonly pid: ProcessId
  /**
   * Waits for the process to exit and returns the `ExitCode` of the command
   * that was run.
   */
  readonly exitCode: Effect<ExitCode, PlatformError>
  /**
   * Returns `true` if the process is still running, otherwise returns `false`.
   */
  readonly isRunning: Effect<boolean, PlatformError>
  /**
   * Kills the running process with the provided signal.
   *
   * If no signal is provided, the signal will defaults to `SIGTERM`.
   */
  readonly kill: (signal?: Signal) => Effect<void, PlatformError>
  /**
   * The standard error stream of the process.
   */
  readonly stderr: Stream<Uint8Array, PlatformError>
  /**
   * The standard input sink of the process.
   */
  readonly stdin: Sink<void, Uint8Array, never, PlatformError>
  /**
   * The standard output stream of the process.
   */
  readonly stdout: Stream<Uint8Array, PlatformError>
}

/**
 * @since 1.0.0
 * @category models
 */
export type ProcessId = Brand.Branded<number, "ProcessId">

/**
 * @since 1.0.0
 */
export declare namespace Process {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Id = ProcessId
}

/**
 * @since 1.0.0
 * @category models
 */
export type Signal =
  | "SIGABRT"
  | "SIGALRM"
  | "SIGBUS"
  | "SIGCHLD"
  | "SIGCONT"
  | "SIGFPE"
  | "SIGHUP"
  | "SIGILL"
  | "SIGINT"
  | "SIGIO"
  | "SIGIOT"
  | "SIGKILL"
  | "SIGPIPE"
  | "SIGPOLL"
  | "SIGPROF"
  | "SIGPWR"
  | "SIGQUIT"
  | "SIGSEGV"
  | "SIGSTKFLT"
  | "SIGSTOP"
  | "SIGSYS"
  | "SIGTERM"
  | "SIGTRAP"
  | "SIGTSTP"
  | "SIGTTIN"
  | "SIGTTOU"
  | "SIGUNUSED"
  | "SIGURG"
  | "SIGUSR1"
  | "SIGUSR2"
  | "SIGVTALRM"
  | "SIGWINCH"
  | "SIGXCPU"
  | "SIGXFSZ"
  | "SIGBREAK"
  | "SIGLOST"
  | "SIGINFO"

/**
 * @since 1.0.0
 * @category models
 */
export type ExitCode = Brand.Branded<number, "ExitCode">

/**
 * @since 1.0.0
 * @category constructors
 */
export const ExitCode: Brand.Brand.Constructor<ExitCode> = internal.ExitCode

/**
 * @since 1.0.0
 * @category constructors
 */
export const ProcessId: Brand.Brand.Constructor<Process.Id> = internal.ProcessId

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeExecutor: (
  start: (command: Command) => Effect<Process, PlatformError, Scope>
) => CommandExecutor = internal.makeExecutor

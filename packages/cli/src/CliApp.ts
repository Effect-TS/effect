/**
 * @since 1.0.0
 */
import type { FileSystem } from "@effect/platform/FileSystem"
import type { Path } from "@effect/platform/Path"
import type { Terminal } from "@effect/platform/Terminal"
import type { Effect } from "effect/Effect"
import type { Pipeable } from "effect/Pipeable"
import type { Command } from "./CommandDescriptor.js"
import type { HelpDoc } from "./HelpDoc.js"
import type { Span } from "./HelpDoc/Span.js"
import * as InternalCliApp from "./internal/cliApp.js"
import type { ValidationError } from "./ValidationError.js"

/**
 * A `CliApp<A>` is a complete description of a command-line application.
 *
 * @since 1.0.0
 * @category models
 */
export interface CliApp<A> extends Pipeable {
  readonly name: string
  readonly version: string
  readonly executable: string
  readonly command: Command<A>
  readonly summary: Span
  readonly footer: HelpDoc
}

/**
 * @since 1.0.0
 */
export declare namespace CliApp {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Environment = FileSystem | Path | Terminal

  /**
   * @since 1.0.0
   * @category models
   */
  export interface ConstructorArgs<A> {
    readonly name: string
    readonly version: string
    readonly command: Command<A>
    readonly executable?: string | undefined
    readonly summary?: Span | undefined
    readonly footer?: HelpDoc | undefined
  }
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <A>(config: CliApp.ConstructorArgs<A>) => CliApp<A> = InternalCliApp.make

/**
 * @since 1.0.0
 * @category execution
 */
export const run: {
  <R, E, A>(
    args: ReadonlyArray<string>,
    execute: (a: A) => Effect<void, E, R>
  ): (self: CliApp<A>) => Effect<void | E, CliApp.Environment | R, ValidationError>
  <R, E, A>(
    self: CliApp<A>,
    args: ReadonlyArray<string>,
    execute: (a: A) => Effect<void, E, R>
  ): Effect<void | E, CliApp.Environment | R, ValidationError>
} = InternalCliApp.run

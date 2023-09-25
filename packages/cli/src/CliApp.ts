/**
 * @since 1.0.0
 */
import type { Command } from "@effect/cli/Command"
import type { HelpDoc } from "@effect/cli/HelpDoc"
import type { Span } from "@effect/cli/HelpDoc/Span"
import * as internal from "@effect/cli/internal/cliApp"
import type { ValidationError } from "@effect/cli/ValidationError"
import type { Effect } from "@effect/io/Effect"

/**
 * A `CliApp<A>` is a complete description of a command-line application.
 *
 * @since 1.0.0
 * @category models
 */
export interface CliApp<A> {
  readonly name: string
  readonly version: string
  readonly command: Command<A>
  readonly summary: Span
  readonly footer: HelpDoc
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: <A>(
  config: {
    name: string
    version: string
    command: Command<A>
    summary?: Span | undefined
    footer?: HelpDoc | undefined
  }
) => CliApp<A> = internal.make

/**
 * @since 1.0.0
 * @category execution
 */
export const run: {
  <R, E, A>(
    args: ReadonlyArray<string>,
    f: (a: A) => Effect<R, E, void>
  ): (self: CliApp<A>) => Effect<R, E | ValidationError, void>
  <R, E, A>(
    self: CliApp<A>,
    args: ReadonlyArray<string>,
    f: (a: A) => Effect<R, E, void>
  ): Effect<R, ValidationError | E, void>
} = internal.run

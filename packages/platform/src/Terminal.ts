/**
 * @since 1.0.0
 */
import type { Tag } from "effect/Context"
import { TaggedError } from "effect/Data"
import type { Effect } from "effect/Effect"
import type { ReadonlyMailbox } from "effect/Mailbox"
import type { Option } from "effect/Option"
import type * as Scope from "effect/Scope"
import type { PlatformError } from "./Error.js"
import * as InternalTerminal from "./internal/terminal.js"

/**
 * A `Terminal` represents a command-line interface which can read input from a
 * user and display messages to a user.
 *
 * @since 1.0.0
 * @category models
 */
export interface Terminal {
  /**
   * The number of columns available on the platform's terminal interface.
   */
  readonly columns: Effect<number>
  /**
   * Reads input events from the default standard input.
   */
  readonly readInput: Effect<ReadonlyMailbox<UserInput>, never, Scope.Scope>
  /**
   * Reads a single line from the default standard input.
   */
  readonly readLine: Effect<string, QuitException>
  /**
   * Displays text to the the default standard output.
   */
  readonly display: (text: string) => Effect<void, PlatformError>
}

/**
 * @since 1.0.0
 * @category model
 */
export interface Key {
  /**
   * The name of the key being pressed.
   */
  readonly name: string
  /**
   * If set to `true`, then the user is also holding down the `Ctrl` key.
   */
  readonly ctrl: boolean
  /**
   * If set to `true`, then the user is also holding down the `Meta` key.
   */
  readonly meta: boolean
  /**
   * If set to `true`, then the user is also holding down the `Shift` key.
   */
  readonly shift: boolean
}

/**
 * @since 1.0.0
 * @category model
 */
export interface UserInput {
  /**
   * The character read from the user (if any).
   */
  readonly input: Option<string>
  /**
   * The key that the user pressed.
   */
  readonly key: Key
}

/**
 * A `QuitException` represents an exception that occurs when a user attempts to
 * quit out of a `Terminal` prompt for input (usually by entering `ctrl`+`c`).
 *
 * @since 1.0.0
 * @category model
 */
export class QuitException extends TaggedError("QuitException")<{}> {}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isQuitException = (u: unknown): u is QuitException =>
  typeof u === "object" && u != null && "_tag" in u && u._tag === "QuitException"

/**
 * @since 1.0.0
 * @category tag
 */
export const Terminal: Tag<Terminal, Terminal> = InternalTerminal.tag

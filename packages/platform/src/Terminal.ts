/**
 * @since 1.0.0
 */
import { TaggedError } from "effect/Data"
import * as Effect from "effect/Effect"
import type { Option } from "effect/Option"
import type { PlatformError } from "./Error.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/Terminal")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * A `Terminal` represents a command-line interface which can read input from a
 * user and display messages to a user.
 *
 * @since 1.0.0
 * @category tags
 */
export class Terminal extends Effect.Tag("@effect/platform/Terminal")<
  Terminal,
  {
    readonly [TypeId]: TypeId
    /**
     * The number of columns available on the platform's terminal interface.
     */
    readonly columns: Effect.Effect<number>
    /**
     * Reads a single input event from the default standard input.
     */
    readonly readInput: Effect.Effect<UserInput, QuitException>
    /**
     * Reads a single line from the default standard input.
     */
    readonly readLine: Effect.Effect<string, QuitException>
    /**
     * Displays text to the the default standard output.
     */
    readonly display: (text: string) => Effect.Effect<void, PlatformError>
  }
>() {}

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
export class QuitException extends TaggedError("QuitException") {}

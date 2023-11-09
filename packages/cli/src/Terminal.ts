/**
 * @since 1.0.0
 */
import type { Context, Effect, Layer } from "effect"
import * as internal from "./internal/terminal.js"

/**
 * Represents a teletype-style (TTY) terminal interface that allows for
 * obtaining user input and rendering text.
 *
 * @since 1.0.0
 * @category models
 */
export interface Terminal {
  /**
   * Obtains the user's input from the terminal.
   */
  readonly getUserInput: Effect.Effect<never, never, Terminal.UserInput>
  /**
   * Displays the provided message to the terminal.
   */
  display(message: string): Effect.Effect<never, never, void>
}

/**
 * @since 1.0.0
 */
export declare namespace Terminal {
  /**
   * Represents a user's input to a terminal.
   *
   * @since 1.0.0
   * @category models
   */
  export interface UserInput {
    readonly action: Action
    readonly value: string
  }

  /**
   * Represents the action parsed from a user's input to a terminal.
   *
   * @since 1.0.0
   * @category models
   */
  export type Action =
    | "Backspace"
    | "CursorFirst"
    | "CursorLast"
    | "CursorUp"
    | "CursorDown"
    | "CursorLeft"
    | "CursorRight"
    | "Delete"
    | "End"
    | "Exit"
    | "Next"
    | "NextPage"
    | "PreviousPage"
    | "Reset"
    | "Retry"
    | "Start"
    | "Submit"
}

/**
 * @since 1.0.0
 * @category context
 */
export const Terminal: Context.Tag<Terminal, Terminal> = internal.Tag

/**
 * @since 1.0.0
 * @category context
 */
export const layer: Layer.Layer<never, never, Terminal> = internal.layer

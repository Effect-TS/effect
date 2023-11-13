/**
 * @since 1.0.0
 */
import type { Terminal, UserInput } from "@effect/platform/Terminal"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { Scope } from "effect/Scope"
import * as InternalTerminal from "./internal/terminal.js"

export type {
  /**
   * @since 1.0.0
   * @category model
   */
  Key,
  /**
   * @since 1.0.0
   * @category model
   */
  UserInput
} from "@effect/platform/Terminal"

export {
  /**
   * @since 1.0.0
   * @category tag
   */
  Terminal
} from "@effect/platform/Terminal"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (shouldQuit?: (input: UserInput) => boolean) => Effect<Scope, never, Terminal> =
  InternalTerminal.make

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<never, never, Terminal> = InternalTerminal.layer

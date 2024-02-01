/**
 * @since 1.0.0
 */
import * as TerminalNode from "@effect/platform-node-shared/TerminalNode"
import type { Terminal, UserInput } from "@effect/platform/Terminal"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { Scope } from "effect/Scope"

/**
 * @since 1.0.0
 * @category constructors
 */
export const make: (shouldQuit?: (input: UserInput) => boolean) => Effect<Scope, never, Terminal> = TerminalNode.make

/**
 * @since 1.0.0
 * @category layer
 */
export const layer: Layer<never, never, Terminal> = TerminalNode.layer

/**
 * Bun-backed implementation of Effect's `Terminal` service.
 *
 * This module reuses the shared Node terminal implementation for Bun. `make`
 * creates a scoped process-backed `Terminal` service, and `layer` provides the
 * default terminal service with the standard quit behavior for key input. Each
 * operation also has its own layer, so a program can provide only the
 * operations it calls.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as NodeTerminal from "@effect/platform-node-shared/NodeTerminal"
import type { Effect } from "effect/Effect"
import type { Layer } from "effect/Layer"
import type { Scope } from "effect/Scope"
import type { Shape, Terminal, UserInput } from "effect/Terminal"

/**
 * Creates a scoped `Terminal` service backed by process stdin/stdout.
 * By default, Esc, Ctrl+C, and Ctrl+D end key input. Supply `shouldQuit` to
 * override these quit keys.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make: (shouldQuit?: (input: UserInput) => boolean) => Effect<Shape, never, Scope> = NodeTerminal.make

/**
 * Provides the default process-backed `Terminal` service, ending key input on
 * bare Esc, Ctrl+C, or Ctrl+D.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer<Terminal> = NodeTerminal.layer
/**
 * Layer that provides `Terminal.columns` alone: it reads the column count of
 * `process.stdout`, or `0` when it is not a TTY.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const columns: Layer<"effect/Terminal/columns"> = NodeTerminal.columns

/**
 * Layer that provides `Terminal.rows` alone: it reads the row count of
 * `process.stdout`, or `0` when it is not a TTY.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const rows: Layer<"effect/Terminal/rows"> = NodeTerminal.rows

/**
 * Layer that provides `Terminal.size` alone: it follows the `resize` events
 * of `process.stdout`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const size: Layer<"effect/Terminal/size"> = NodeTerminal.size

/**
 * Layer that provides `Terminal.readInput` alone: it reads key input from
 * `process.stdin` with Node `readline`, in TTY raw mode, ending on bare Esc,
 * Ctrl+C, or Ctrl+D. Merged with {@link readLine}, the two share one `stdin`
 * reader.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readInput: Layer<"effect/Terminal/readInput"> = NodeTerminal.readInput

/**
 * Layer that provides `Terminal.readLine` alone: it reads lines from
 * `process.stdin` with Node `readline`. Merged with {@link readInput}, the
 * two share one `stdin` reader.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readLine: Layer<"effect/Terminal/readLine"> = NodeTerminal.readLine

/**
 * Layer that provides `Terminal.display` alone: it writes to
 * `process.stdout`, without `readline` or `stdin`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const display: Layer<"effect/Terminal/display"> = NodeTerminal.display

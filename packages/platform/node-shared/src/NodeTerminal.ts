/**
 * Shared Node.js implementation of Effect's `Terminal` service.
 *
 * `NodeTerminal` adapts Node's `readline` APIs plus the current process
 * `stdin` and `stdout` streams into {@link Terminal.Terminal}. The service can
 * display output, read a line, stream key input, and read terminal dimensions.
 * `make` manages readline and TTY raw mode in a scope, while `layer` provides
 * the default service that ends key input on bare Esc, Ctrl+C, or Ctrl+D.
 *
 * Each operation of `effect/Terminal` also has its own layer here, named after
 * the operation, so a program that only calls `Terminal.display` can provide
 * `NodeTerminal.display` and bundle neither `readline` nor the key input
 * reader. `readInput` and `readLine` share one `stdin` reader when both are
 * provided.
 *
 * @stability unstable
 * @since 4.0.0
 */
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Scope from "effect/Scope"
import * as Terminal from "effect/Terminal"
import * as Columns from "./internal/terminal/columns.ts"
import * as Display from "./internal/terminal/display.ts"
import * as Input from "./internal/terminal/input.ts"
import * as ReadInput from "./internal/terminal/readInput.ts"
import * as ReadLine from "./internal/terminal/readLine.ts"
import * as Rows from "./internal/terminal/rows.ts"
import * as Size from "./internal/terminal/size.ts"

/**
 * Creates a scoped process-backed `Terminal` using Node `readline`, enabling
 * TTY raw mode while key input is read. By default, Esc, Ctrl+C, and Ctrl+D
 * end key input. Supply `shouldQuit` to override these quit keys.
 *
 * @stability unstable
 * @category constructors
 * @since 4.0.0
 */
export const make: (
  shouldQuit?: (input: Terminal.UserInput) => boolean
) => Effect.Effect<Terminal.Shape, never, Scope.Scope> = Effect.fnUntraced(
  function*(shouldQuit: (input: Terminal.UserInput) => boolean = Input.defaultShouldQuit) {
    const input = yield* Input.make(shouldQuit)
    return Terminal.make({
      columns: Columns.columns,
      rows: Rows.rows,
      size: Size.size,
      readInput: ReadInput.make(input),
      readLine: ReadLine.make(input),
      display: Display.display
    })
  }
)

/**
 * Provides the default process-backed `Terminal` service, ending key input on
 * bare Esc, Ctrl+C, or Ctrl+D.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const layer: Layer.Layer<Terminal.Terminal> = Layer.effect(Terminal.Terminal, make(Input.defaultShouldQuit))

/**
 * Layer that provides `Terminal.columns` alone: it reads the column count of
 * `process.stdout`, or `0` when it is not a TTY.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const columns: Layer.Layer<"effect/Terminal/columns"> = Columns.layer

/**
 * Layer that provides `Terminal.rows` alone: it reads the row count of
 * `process.stdout`, or `0` when it is not a TTY.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const rows: Layer.Layer<"effect/Terminal/rows"> = Rows.layer

/**
 * Layer that provides `Terminal.size` alone: it follows the `resize` events
 * of `process.stdout`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const size: Layer.Layer<"effect/Terminal/size"> = Size.layer

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
export const readInput: Layer.Layer<"effect/Terminal/readInput"> = ReadInput.layer

/**
 * Layer that provides `Terminal.readLine` alone: it reads lines from
 * `process.stdin` with Node `readline`. Merged with {@link readInput}, the
 * two share one `stdin` reader.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const readLine: Layer.Layer<"effect/Terminal/readLine"> = ReadLine.layer

/**
 * Layer that provides `Terminal.display` alone: it writes to
 * `process.stdout`, without `readline` or `stdin`.
 *
 * @stability unstable
 * @category layers
 * @since 4.2.0
 */
export const display: Layer.Layer<"effect/Terminal/display"> = Display.layer

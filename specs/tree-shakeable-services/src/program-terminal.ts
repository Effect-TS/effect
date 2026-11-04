/**
 * A program that uses two of the six terminal operations, one of which is a
 * value: `columns` is an Effect, so it is called with no arguments.
 *
 *   Effect<void, TerminalError, "effect/Terminal/columns" | "effect/Terminal/display">
 */
import * as Effect from "effect/Effect"
import * as Terminal from "./Terminal.ts"

export const banner = (text: string) =>
  Effect.gen(function*() {
    const width = yield* Terminal.columns()
    const line = "=".repeat(Math.min(width, text.length + 4))
    yield* Terminal.display(`${line}\n  ${text}\n${line}\n`)
    return width
  })

/**
 * The contract of a terminal, modelled on `effect/Terminal` in v4: the second
 * worked migration in the spec, and the one whose members are mostly Effects
 * rather than functions.
 *
 * Five of the six members of `effect/Terminal` are Effects (`columns`, `rows`,
 * `size`, `readInput`, `readLine`); only `display` takes arguments. An
 * Effect-valued member is a value operation: the member keeps its shape, and
 * the standalone form is that Effect with the key in `R`, so `yield*
 * Terminal.columns` standalone reads as `yield* terminal.columns` through the
 * record, and an implementation is an Effect in both.
 */
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import type * as Effect from "effect/Effect"
import type * as Queue from "effect/Queue"
import type * as Scope from "effect/Scope"

export class TerminalError extends Data.TaggedError("TerminalError")<{
  readonly operation: string
  readonly cause: unknown
}> {}

export class QuitError extends Data.TaggedError("QuitError")<{}> {}

export interface Size {
  readonly columns: number
  readonly rows: number
}

export interface UserInput {
  readonly input: string | undefined
  readonly key: { readonly name: string; readonly ctrl: boolean }
}

export const columns = Context.Operation.value<Effect.Effect<number>>()("effect/Terminal/columns")

export const rows = Context.Operation.value<Effect.Effect<number>>()("effect/Terminal/rows")

export const size = Context.Operation.value<Effect.Effect<Queue.Dequeue<Size>, never, Scope.Scope>>()(
  "effect/Terminal/size"
)

export const readInput = Context.Operation.value<Effect.Effect<Queue.Dequeue<UserInput>, never, Scope.Scope>>()(
  "effect/Terminal/readInput"
)

export const readLine = Context.Operation.value<Effect.Effect<string, QuitError>>()("effect/Terminal/readLine")

export const display = Context.Operation<(text: string) => Effect.Effect<void, TerminalError>>()(
  "effect/Terminal/display"
)

const members = { columns, rows, size, readInput, readLine, display }

export type Terminal = Context.Operations.Identifier<typeof members>
export interface Shape extends Context.Operations.Shape<typeof members>, Context.Operations.Named {}

export const Terminal = Context.Operations<Terminal, Shape>()("effect/Terminal", members)

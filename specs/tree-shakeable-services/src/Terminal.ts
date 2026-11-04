/**
 * The contract of a terminal, modelled on `effect/Terminal` in v4: the second
 * worked migration in the spec, and the one whose members are mostly values.
 *
 * Five of the six members are Effects rather than functions (`columns`,
 * `rows`, `size`, `readInput`, `readLine`); only `display` takes arguments.
 * A member whose shape is an Effect is still an operation: it is called with
 * no arguments, `yield* Terminal.columns()`, and the record keeps the member
 * as the Effect it is today, `(yield* Terminal).columns`.
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

export const columns: Context.Operation<"effect/Terminal/columns", Effect.Effect<number>> = /* @__PURE__ */ Context
  .Operation("effect/Terminal/columns")

export const rows: Context.Operation<"effect/Terminal/rows", Effect.Effect<number>> = /* @__PURE__ */ Context
  .Operation("effect/Terminal/rows")

export const size: Context.Operation<
  "effect/Terminal/size",
  Effect.Effect<Queue.Dequeue<Size>, never, Scope.Scope>
> = /* @__PURE__ */ Context.Operation("effect/Terminal/size")

export const readInput: Context.Operation<
  "effect/Terminal/readInput",
  Effect.Effect<Queue.Dequeue<UserInput>, never, Scope.Scope>
> = /* @__PURE__ */ Context.Operation("effect/Terminal/readInput")

export const readLine: Context.Operation<"effect/Terminal/readLine", Effect.Effect<string, QuitError>> =
  /* @__PURE__ */ Context.Operation("effect/Terminal/readLine")

export const display: Context.Operation<
  "effect/Terminal/display",
  (text: string) => Effect.Effect<void, TerminalError>
> = /* @__PURE__ */ Context.Operation("effect/Terminal/display")

const members = { columns, rows, size, readInput, readLine, display }

export type Terminal = Context.Operations.Identifier<typeof members>
export interface Shape extends Context.Operations.Shape<typeof members> {}

export const Terminal: Context.Operations<Terminal, Shape> = /* @__PURE__ */ Context.Operations(
  "effect/Terminal",
  members
)

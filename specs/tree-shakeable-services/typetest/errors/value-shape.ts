// A value operation is an Effect, not a function: it is yielded, not called. Its constructor takes an Effect shape;
// a function shape belongs to `Context.Operation`.
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Terminal from "../../src/Terminal.ts"

export const called = Terminal.columns()

export const functionShape = Context.Operation.value<() => Effect.Effect<number>>()("test/columns")

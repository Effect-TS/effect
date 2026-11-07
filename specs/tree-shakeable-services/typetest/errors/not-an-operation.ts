// An operation is a function returning an Effect (Stream.Operation and Sink.Operation take functions returning a
// Stream or a Sink). A synchronous function, a plain value and an Effect value are ordinary services.
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

export const sync = Context.Operation<(path: string) => string>()("test/sync")

export const value = Context.Operation<{ readonly port: number }>()("test/value")

export const effectValue = Context.Operation<Effect.Effect<number>>()("test/columns")

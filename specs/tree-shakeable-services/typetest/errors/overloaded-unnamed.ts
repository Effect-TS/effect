// An overloaded shape must name its key, otherwise only the last overload would survive. The definition is rejected.
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

export const format = Context.Operation<{
  (value: number): Effect.Effect<string>
  (value: Date, locale: string): Effect.Effect<string>
}>()("test/format")

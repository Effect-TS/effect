import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Terminal from "../../Terminal.ts"

/** The Node implementation of `Terminal.columns`: the implementation of a value operation is the Effect itself. */
export const columns = Layer.succeed(Terminal.columns, Effect.sync(() => process.stdout.columns ?? 80))

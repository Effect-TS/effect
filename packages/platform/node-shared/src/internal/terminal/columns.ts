import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Terminal from "effect/Terminal"

/** @internal */
export const columns: Terminal.Shape["columns"] = Effect.sync(() => process.stdout.columns ?? 0)

/** @internal */
export const layer: Layer.Layer<"effect/Terminal/columns"> = Layer.succeed(Terminal.columns, columns)

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Terminal from "effect/Terminal"

/** @internal */
export const rows: Terminal.Shape["rows"] = Effect.sync(() => process.stdout.rows ?? 0)

/** @internal */
export const layer: Layer.Layer<"effect/Terminal/rows"> = Layer.succeed(Terminal.rows, rows)

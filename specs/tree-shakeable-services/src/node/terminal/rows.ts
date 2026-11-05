import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Terminal from "../../Terminal.ts"

/** The Node implementation of `Terminal.rows`. */
export const rows = Layer.succeed(Terminal.rows, () => Effect.sync(() => process.stdout.rows ?? 24))

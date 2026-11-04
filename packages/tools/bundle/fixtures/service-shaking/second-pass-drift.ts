import * as Effect from "effect/Effect"
import { Drift, layer } from "./second-pass-drift-layer.ts"

// In the second build only, the test makes this consumer call `unused` instead of `read`.
export const main = () => Effect.runPromise(Effect.provide(Drift.useSync((s) => `${s.read()}`), layer))

import * as Effect from "effect/Effect"
import { Drift, layer } from "./second-pass-drift-layer.ts"

// In the second build only, the test makes this consumer call `unused` instead of `read`.
const main = () => Effect.runPromise(Effect.provide(Drift.useSync((s) => `${s.read()}`), layer))

// A closed program: it exports nothing and prints its result.
main().then((output) => console.log(output))

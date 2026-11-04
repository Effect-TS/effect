import * as Effect from "effect/Effect"
import { Key } from "./resolution-drift-a.ts"
import { layer } from "./resolution-drift-layer.ts"

// The test resolves this module's `Key` import to `resolution-drift-b.ts` in
// the second build only. Every module's source is the same in both builds.
export const main = () => Effect.runPromise(Effect.provide(Key.useSync((s) => `${s.read()}`), layer))

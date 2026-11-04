import * as Layer from "effect/Layer"
import { Key as A } from "./resolution-drift-a.ts"
import { Key as B } from "./resolution-drift-b.ts"

export interface Store {
  read(): number
  unused(): number
}

// Provides both keys, so both key modules are in every build.
export const layer = Layer.mergeAll(
  Layer.succeed(A, { read: () => 1, unused: () => 2 }),
  Layer.succeed(B, { read: () => 1, unused: () => 2 })
)

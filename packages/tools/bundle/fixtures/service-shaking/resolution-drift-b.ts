import * as Context from "effect/Context"
import type { Store } from "./resolution-drift-layer.ts"

export const Key = Context.Service<Store>("test/ResolutionB")

import * as Context from "effect/Context"
import * as Layer from "effect/Layer"

export interface Store {
  read(): number
  unused(): number
}

// Provider for `second-pass-drift.ts`, kept in its own module so the edited
// module and the consumer that drifts are different files.
export const Drift = Context.Service<Store>("test/Drift")

export const layer = Layer.succeed(Drift, { read: () => 1, unused: () => 2 })

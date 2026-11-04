import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// After the write, looking up `Mutated` finds the service provided for `Target`.
const Mutated = Context.Service<Store>("test/Mutated")
const Target = Context.Service<Store>("test/Target")
;(Mutated as { key: string }).key = Target.key

export const main = () =>
  Effect.runPromise(
    Effect.provide(Mutated.useSync((s) => `${s.read()}`), Layer.succeed(Target, { read: () => 1, unused: () => 2 }))
  )

import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// `read` is not an inline method, but still reads `unused` through `this`.
function read(this: Store): number {
  return this.unused()
}

const Receiver = Context.Service<Store>("test/Receiver")

export const main = () =>
  Effect.runPromise(
    Effect.provide(Receiver.useSync((s) => `${s.read()}`), Layer.succeed(Receiver, { read, unused: () => 2 }))
  )

import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// `read` is reassigned before the provider is built, so its original
// declaration says nothing about what it reads through `this`.
function read(): number {
  return 1
}
// @ts-expect-error reassigning a function declaration is valid JavaScript
// oxlint-disable-next-line no-func-assign
read = function(this: Store) {
  return this.unused()
}

const Receiver = Context.Service<Store>("test/MutableReceiver")

export const main = () =>
  Effect.runPromise(
    Effect.provide(Receiver.useSync((s) => `${s.read()}`), Layer.succeed(Receiver, { read, unused: () => 2 }))
  )

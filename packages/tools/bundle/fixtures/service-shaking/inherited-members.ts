import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// Members inherited from Object.prototype observe the whole service.
const Inherited = Context.Service<Store>("test/Inherited")

export const main = () =>
  Effect.runPromise(
    Effect.provide(
      // oxlint-disable-next-line no-prototype-builtins
      Inherited.useSync((s) => `${s.read()} ${s.hasOwnProperty("unused")} ${Object.keys(s.valueOf()).join(",")}`),
      Layer.succeed(Inherited, { read: () => 1, unused: () => 2 })
    )
  )

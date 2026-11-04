import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}

// The running Fiber is published on globalThis under a string key.
const Global = Context.Service<Store>("test/GlobalFiber")
const layer = Layer.succeed(Global, { read: () => 1, unused: () => 2 })

const unusedType = () => {
  const fiber: object = Reflect.get(globalThis, "~effect/Fiber/currentFiber")
  const services: ReadonlyMap<string, object> = Reflect.get(Reflect.get(fiber, "context"), "mapUnsafe")
  return typeof Reflect.get(services.get("test/GlobalFiber")!, "unused")
}

export const main = () =>
  Effect.runPromise(
    Effect.provide(Effect.flatMap(Global.useSync((s) => s.read()), () => Effect.sync(unusedType)), layer)
  )

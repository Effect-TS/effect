import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

// A plain computed read, so this fixture only depends on the rule it targets.
const property = (target: object, key: string): any => (target as Record<string, any>)[key]

interface Store {
  read(): number
  unused(): number
}

// The running Fiber is published on globalThis under a string key.
const Global = Context.Service<Store>("test/GlobalFiber")
const layer = Layer.succeed(Global, { read: () => 1, unused: () => 2 })

const unusedType = () => {
  const fiber: object = property(globalThis, "~effect/Fiber/currentFiber")
  const services: ReadonlyMap<string, object> = property(property(fiber, "context"), "mapUnsafe")
  return typeof property(services.get("test/GlobalFiber")!, "unused")
}

const main = () =>
  Effect.runPromise(
    Effect.provide(Effect.flatMap(Global.useSync((s) => s.read()), () => Effect.sync(unusedType)), layer)
  )

// A closed program: it exports nothing and prints its result.
main().then((output) => console.log(output))

import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"

interface Store {
  read(): number
  unused(): number
}
import * as Option from "effect/Option"

// A plain computed read, so this fixture only depends on the rule it targets.
const property = (target: object, key: string): any => (target as Record<string, any>)[key]

// Formatting an Option calls the Redactable protocol, which receives the
// current Fiber's Context.
const Redacted = Context.Service<Store>("test/RedactableOption")
const layer = Layer.succeed(Redacted, { read: () => 1, unused: () => 2 })

const payload = {
  [Symbol.for("~effect/Redactable")](context: object) {
    const services: ReadonlyMap<string, object> = property(context, "mapUnsafe")
    return typeof property(services.get("test/RedactableOption")!, "unused")
  }
}

const main = () =>
  Effect.runPromise(
    Effect.provide(
      Effect.flatMap(Redacted.useSync((s) => s.read()), () => Effect.sync(() => Option.some(payload).toString())),
      layer
    )
  )

// A closed program: it exports nothing and prints its result.
main().then((output) => console.log(output))

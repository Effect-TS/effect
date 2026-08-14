import * as Effect from "effect/Effect"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"

const count = Atom.make(0)
const double = Atom.make((get) => get(count) * 2)
const effectful = Atom.make(Effect.succeed(123))

const registry = AtomRegistry.make()
registry.set(count, 1)
registry.get(double)
registry.get(effectful)

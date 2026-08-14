import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Atom from "effect/unstable/reactivity/Atom"
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry"

interface Users {
  readonly list: Effect.Effect<ReadonlyArray<number>>
}
const Users = Context.Service<Users>("Users")
const UsersLayer = Layer.succeed(Users, { list: Effect.succeed([1, 2, 3]) })

const runtime = Atom.runtime(UsersLayer)
const users = runtime.atom(Users.use((u) => u.list))

const registry = AtomRegistry.make()
registry.get(users)

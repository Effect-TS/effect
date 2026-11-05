/**
 * A record service defined in its own module, so that a root can call it
 * through a namespace import, `Users.create(name)`, which a bundler rewrites
 * to a bare call.
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

export const find = Context.Operation<(name: string) => Effect.Effect<string>>()("fixture/Users/find")

// built on its sibling, so its shape names it: an implementation may call `find` through the operation
export const create = Context.Operation<(name: string) => Effect.Effect<string, never, "fixture/Users/find">>()(
  "fixture/Users/create"
)

export const Users = Context.Operations("fixture/Users", { find, create })

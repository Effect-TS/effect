// ets_tracing: off

import type { Has, Tag } from "../Has/index.js"
import type { Managed } from "../Managed/managed.js"
import { use_ } from "../Managed/use.js"
import type { Effect } from "./effect.js"
import * as has from "./has.js"
import * as provide from "./provide.js"

/**
 * Provides a managed to the given effect
 */
export function provideSomeManaged<R, E, A>(managed: Managed<R, E, A>) {
  return <R1, E1, A1>(self: Effect<R1 & A, E1, A1>): Effect<R & R1, E | E1, A1> =>
    use_(managed, (a) => provide.provide(a)(self))
}

/**
 * Provides a managed to the given effect
 */
export function provideServiceManaged<A>(tag: Tag<A>) {
  return <R, E>(managed: Managed<R, E, A>) =>
    <R1, E1, A1>(self: Effect<R1 & Has<A>, E1, A1>): Effect<R & R1, E | E1, A1> =>
      use_(managed, (a) => has.provideService(tag)(a)(self))
}

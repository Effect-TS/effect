import type { Has, Tag } from "../../../data/Has"
import { mergeEnvironments } from "../../../data/Has"
import type { Managed } from "../definition"
import type { Effect } from "./_internal/effect-api"
import { chain_ } from "./chain"
import { environmentWithManaged } from "./environmentWithManaged"
import { fromEffect } from "./fromEffect"
import { provideEnvironment_ } from "./provideEnvironment"

/**
 * Provides the service with the required service entry.
 */
export function provideServiceEffect<T>(_: Tag<T>) {
  return <R, E>(effect: Effect<R, E, T>) =>
    <R1, E1, A1>(self: Managed<R1 & Has<T>, E1, A1>): Managed<R & R1, E | E1, A1> =>
      environmentWithManaged((r: R & R1) =>
        chain_(fromEffect(effect), (t) =>
          provideEnvironment_(self, mergeEnvironments(_, r, t))
        )
      )
}

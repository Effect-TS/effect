// ets_tracing: off

import type { Has, Tag } from "../../Has"
import { mergeEnvironments } from "../../Has"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { environmentWithManaged } from "./environmentWithManaged"
import { provideEnvironment_ } from "./provideEnvironment"

/**
 * Provides the service with the required service entry.
 */
export function provideServiceManaged<T>(_: Tag<T>) {
  return <R, E>(managed: Managed<R, E, T>) =>
    <R1, E1, A1>(self: Managed<R1 & Has<T>, E1, A1>): Managed<R & R1, E | E1, A1> =>
      environmentWithManaged((r: R & R1) =>
        chain_(managed, (t) => provideEnvironment_(self, mergeEnvironments(_, r, t)))
      )
}

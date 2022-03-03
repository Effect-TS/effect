import type { Effect } from "../../../Effect"
import type { Counter } from "../definition"

/**
 * @tsplus getter ets/Counter apply
 */
export function apply<A>(self: Counter<A>, __tsplusTrace?: string) {
  return <R, E, A1 extends A>(effect: Effect<R, E, A1>): Effect<R, E, A1> =>
    self.appliedAspect(effect)
}

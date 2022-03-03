import type { Effect } from "../../../Effect"
import type { SetCount } from "../definition"

/**
 * @tsplus getter ets/SetCount apply
 */
export function apply<A>(self: SetCount<A>, __tsplusTrace?: string) {
  return <R, E, A1 extends A>(effect: Effect<R, E, A1>): Effect<R, E, A1> =>
    self.appliedAspect(effect)
}

import type { Supervisor } from "../Supervisor"
import type { Effect } from "./effect"
import { ISupervise } from "./primitives"

/**
 * Returns an effect with the behavior of this one, but where all child
 * fibers forked in the effect are reported to the specified supervisor.
 */
export function supervised(supervisor: Supervisor<any>) {
  return <R, E, A>(fa: Effect<R, E, A>): Effect<R, E, A> =>
    new ISupervise(fa, supervisor).effect
}

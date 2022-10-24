import { constVoid } from "@fp-ts/data/Function"

/**
 * Returns a new schedule that maps the output of this schedule to unit.
 *
 * @tsplus getter effect/core/io/Schedule unit
 * @category constructors
 * @since 1.0.0
 */
export function unit<State, Env, In, Out>(
  self: Schedule<State, Env, In, Out>
): Schedule<State, Env, In, void> {
  return self.map(constVoid)
}

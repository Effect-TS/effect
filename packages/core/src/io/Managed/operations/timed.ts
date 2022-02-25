import { Tuple } from "../../../collection/immutable/Tuple"
import type { HasClock } from "../../Clock"
import { Managed } from "../definition"

/**
 * Returns a new effect that executes this one and times the acquisition of
 * the resource.
 *
 * @tsplus fluent ets/Managed timed
 */
export function timed<R, E, A>(
  self: Managed<R, E, A>,
  __tsplusTrace?: string
): Managed<R & HasClock, E, Tuple<[number, A]>> {
  return Managed(
    self.effect.timed().map(
      ({
        tuple: [
          duration,
          {
            tuple: [fin, a]
          }
        ]
      }) => Tuple(fin, Tuple(duration, a))
    )
  )
}

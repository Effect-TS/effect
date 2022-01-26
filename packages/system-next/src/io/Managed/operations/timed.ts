import * as Tp from "../../../collection/immutable/Tuple"
import type { HasClock } from "../../Clock"
import { Managed } from "../definition"

/**
 * Returns a new effect that executes this one and times the acquisition of
 * the resource.
 *
 * @ets fluent ets/Managed timed
 */
export function timed<R, E, A>(
  self: Managed<R, E, A>,
  __etsTrace?: string
): Managed<R & HasClock, E, Tp.Tuple<[number, A]>> {
  return Managed(
    self.effect.timed().map(
      ({
        tuple: [
          duration,
          {
            tuple: [fin, a]
          }
        ]
      }) => Tp.tuple(fin, Tp.tuple(duration, a))
    )
  )
}

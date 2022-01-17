import type { HasClock } from "../../Clock"
import * as Tp from "../../Collections/Immutable/Tuple"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as T from "./_internal/effect"

/**
 * Returns a new effect that executes this one and times the acquisition of
 * the resource.
 */
export function timed<R, E, A>(
  self: Managed<R, E, A>,
  __trace?: string
): Managed<R & HasClock, E, Tp.Tuple<[number, A]>> {
  return managedApply(
    T.map_(
      T.timed(self.effect),
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

import * as O from "../../../data/Option"
import type { IO } from "../../Effect"
import { Effect } from "../../Effect"
import { forEach, forEach_ } from "../../Exit/operations/forEach"
import type { Fiber } from "../definition"
import { makeSynthetic } from "./makeSynthetic"

/**
 * Effectually maps over the value the fiber computes.
 */
export function mapEffect_<E, E1, A, B>(
  self: Fiber<E, A>,
  f: (a: A) => IO<E1, B>
): Fiber<E | E1, B> {
  return makeSynthetic({
    id: self.id,
    await: self.await.flatMap(forEach(f)),
    children: self.children,
    inheritRefs: self.inheritRefs,
    poll: self.poll.flatMap(
      O.fold(
        () => Effect.succeedNow(O.none),
        (exit) => forEach_(exit, f).map(O.some)
      )
    ),
    getRef: (ref) => self.getRef(ref),
    interruptAs: (id) => self.interruptAs(id).flatMap(forEach(f))
  })
}

/**
 * Effectually maps over the value the fiber computes.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<E1, A, B>(f: (a: A) => IO<E1, B>) {
  return <E>(self: Fiber<E, A>): Fiber<E | E1, B> => mapEffect_(self, f)
}

// ets_tracing: off

import { forEach, forEach_ } from "../../Exit/operations/forEach"
import * as O from "../../Option"
import type { Fiber } from "../definition"
import * as T from "./_internal/effect"
import { makeSynthetic } from "./makeSynthetic"

/**
 * Effectually maps over the value the fiber computes.
 */
export function mapEffect_<E, E1, A, B>(
  self: Fiber<E, A>,
  f: (a: A) => T.IO<E1, B>
): Fiber<E | E1, B> {
  return makeSynthetic({
    id: self.id,
    await: T.chain_(self.await, forEach(f)),
    children: self.children,
    inheritRefs: self.inheritRefs,
    poll: T.chain_(
      self.poll,
      O.fold(
        () => T.succeedNow(O.none),
        (exit) => T.map_(forEach_(exit, f), O.some)
      )
    ),
    getRef: (ref) => self.getRef(ref),
    interruptAs: (id) => T.chain_(self.interruptAs(id), forEach(f))
  })
}

/**
 * Effectually maps over the value the fiber computes.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<E1, A, B>(f: (a: A) => T.IO<E1, B>) {
  return <E>(self: Fiber<E, A>): Fiber<E | E1, B> => mapEffect_(self, f)
}

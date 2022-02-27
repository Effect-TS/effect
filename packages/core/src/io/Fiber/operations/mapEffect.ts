import { Option } from "../../../data/Option"
import type { IO } from "../../Effect"
import { Effect } from "../../Effect"
import type { Fiber } from "../definition"
import { makeSynthetic } from "../definition"

/**
 * Effectually maps over the value the fiber computes.
 *
 * @tsplus fluent ets/Fiber mapEffect
 * @tsplus fluent ets/RuntimeFiber mapEffect
 */
export function mapEffect_<E, E1, A, B>(
  self: Fiber<E, A>,
  f: (a: A) => IO<E1, B>,
  __tsplusTrace?: string
): Fiber<E | E1, B> {
  return makeSynthetic({
    id: self.id,
    await: self.await().flatMap((_) => _.forEach(f)),
    children: self.children,
    inheritRefs: self.inheritRefs(),
    poll: self.poll().flatMap((_) =>
      _.fold(
        () => Effect.succeedNow(Option.none),
        (exit) => exit.forEach(f).map(Option.some)
      )
    ),
    getRef: (ref) => self.getRef(ref),
    interruptAs: (id) => self.interruptAs(id).flatMap((exit) => exit.forEach(f))
  })
}

/**
 * Effectually maps over the value the fiber computes.
 *
 * @ets_data_first mapEffect_
 */
export function mapEffect<E1, A, B>(f: (a: A) => IO<E1, B>, __tsplusTrace?: string) {
  return <E>(self: Fiber<E, A>): Fiber<E | E1, B> => self.mapEffect(f)
}

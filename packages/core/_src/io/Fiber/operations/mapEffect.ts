import { makeSynthetic } from "@effect/core/io/Fiber/definition"

/**
 * Effectually maps over the value the fiber computes.
 *
 * @tsplus fluent ets/Fiber mapEffect
 * @tsplus fluent ets/RuntimeFiber mapEffect
 */
export function mapEffect_<E, E1, A, B>(
  self: Fiber<E, A>,
  f: (a: A) => Effect.IO<E1, B>,
  __tsplusTrace?: string
): Fiber<E | E1, B> {
  return makeSynthetic({
    id: self.id,
    await: self.await().flatMap((_) => _.forEach(f)),
    children: self.children(),
    inheritRefs: self.inheritRefs(),
    poll: self.poll().flatMap((_) =>
      _.fold(
        () => Effect.succeedNow(Option.none),
        (exit) => exit.forEach(f).map(Option.some)
      )
    ),
    interruptAs: (id) => self.interruptAs(id).flatMap((exit) => exit.forEach(f))
  })
}

/**
 * Effectually maps over the value the fiber computes.
 *
 * @tsplus static ets/Fiber/Aspects mapEffect
 */
export const mapEffect = Pipeable(mapEffect_)

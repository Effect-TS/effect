import { makeSynthetic } from "@effect/core/io/Fiber/definition"

/**
 * Zips this fiber with the specified fiber, combining their results using the
 * specified combiner function. Both joins and interruptions are performed in
 * sequential order from left to right.
 *
 * @tsplus fluent ets/Fiber zipWith
 * @tsplus fluent ets/RuntimeFiber zipWith
 */
export function zipWith_<E, E1, A, B, C>(
  self: Fiber<E, A>,
  that: Fiber<E1, B>,
  f: (a: A, b: B) => C
): Fiber<E | E1, C> {
  return makeSynthetic({
    id: self.id.getOrElse(that.id),
    await: self
      .await()
      .flatMap((exit) => Effect.done(exit))
      .zipWithPar(
        that.await().flatMap((exit) => Effect.done(exit)),
        f
      )
      .exit(),
    children: self.children(),
    inheritRefs: that.inheritRefs() > self.inheritRefs(),
    interruptAs: (id) =>
      self
        .interruptAs(id)
        .zipWith(that.interruptAs(id), (ea, eb) => ea.zipWith(eb, f, Cause.both)),
    poll: self
      .poll()
      .zipWith(that.poll(), (oa, ob) => oa.flatMap((ea) => ob.map((eb) => ea.zipWith(eb, f, Cause.both))))
  })
}

/**
 * Zips this fiber with the specified fiber, combining their results using the
 * specified combiner function. Both joins and interruptions are performed in
 * sequential order from left to right.
 *
 * @tsplus static ets/Fiber/Aspects zipWith
 */
export const zipWith = Pipeable(zipWith_)

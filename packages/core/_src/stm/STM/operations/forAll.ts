/**
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static effect/core/stm/STM.Ops forAll
 */
export function forAll<R, E, A>(
  as: Collection<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, boolean> {
  return STM.suspend(loop(as[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, boolean> {
  const next = iterator.next()
  return next.done
    ? STM.succeed(true)
    : f(next.value).flatMap((b) => (b ? loop(iterator, f) : STM.succeed(b)))
}

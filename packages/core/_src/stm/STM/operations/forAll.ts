/**
 * Determines whether all elements of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static ets/STM/Ops forAll
 */
export function forAll<R, E, A>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, boolean> {
  return STM.succeed(as).flatMap((Collection) => loop(Collection[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, boolean> {
  const next = iterator.next()
  return next.done
    ? STM.succeedNow(true)
    : f(next.value).flatMap((b) => (b ? loop(iterator, f) : STM.succeedNow(b)))
}

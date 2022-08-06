/**
 * Determines whether any element of the `Collection<A>` satisfies the effectual
 * predicate `f`.
 *
 * @tsplus static effect/core/stm/STM.Ops exists
 */
export function exists<R, E, A>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, boolean> {
  return STM.sync(as).flatMap((collection) => loop(collection[Symbol.iterator](), f))
}

function loop<R, E, A>(
  iterator: Iterator<A>,
  f: (a: A) => STM<R, E, boolean>
): STM<R, E, boolean> {
  const next = iterator.next()
  if (next.done) {
    return STM.succeed(false)
  }
  return f(next.value).flatMap((b) => b ? STM.succeed(b) : STM.suspend(loop(iterator, f)))
}

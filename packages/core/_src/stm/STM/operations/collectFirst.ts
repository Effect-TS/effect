/**
 * Collects the first element of the `Collection<A?` for which the effectual
 * function `f` returns `Some`.
 *
 * @tsplus static ets/STM/Ops collectFirst
 */
export function collectFirst<R, E, A, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, E, Option<B>>
): STM<R, E, Option<B>> {
  return STM.succeed(as).flatMap((Collection) => loop(Collection[Symbol.iterator](), f));
}

function loop<R, E, A, B>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => STM<R, E, Option<B>>
): STM<R, E, Option<B>> {
  const next = iterator.next();
  return next.done
    ? STM.none
    : f(next.value).flatMap((option) => option.fold(loop(iterator, f), STM.some));
}

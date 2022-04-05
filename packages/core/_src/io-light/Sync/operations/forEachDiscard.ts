/**
 * Applies the function `f` to each element of the `Collection<A>` and runs
 * produced Syncs sequentially.
 *
 * Equivalent to `asUnit(forEach(as, f))`, but without the cost of building
 * the list of results.
 *
 * @tsplus static ets/Sync/Ops forEachDiscard
 */
export function forEachDiscard<R, E, A, X>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Sync<R, E, X>,
  __tsplusTrace?: string
): Sync<R, E, void> {
  return Sync.succeed(as).flatMap((collection) => Sync.suspend(loop(collection[Symbol.iterator](), f)));
}

function loop<R, E, A, X>(
  iterator: Iterator<A, any, undefined>,
  f: (a: A) => Sync<R, E, X>,
  __tsplusTrace?: string
): Sync<R, E, void> {
  const next = iterator.next();
  if (next == null || next.done) {
    return Sync.unit;
  }
  return f(next.value) > loop(iterator, f);
}

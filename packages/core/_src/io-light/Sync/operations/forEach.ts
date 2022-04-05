/**
 * Applies the function `f` to each element of the `Collection<A>` and
 * returns the results in a new `Chunk<B>`.
 *
 * If you do not need the results, see `forEachDiscard` for a more efficient
 * implementation.
 *
 * @tsplus static ets/Sync/Ops forEach
 */
export function forEach<A, R, E, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => Sync<R, E, B>
): Sync<R, E, Chunk<B>> {
  return Sync.suspend(() => {
    const acc: B[] = [];
    return Sync.forEachDiscard(as, (_) =>
      f(_).map((b) => {
        acc.push(b);
      })).map(() => Chunk.from(acc));
  });
}

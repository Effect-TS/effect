/**
 * Applies the function `f` to each element of the `Collection<A>` and
 * returns a transactional effect that produces a new `Chunk<B>`.
 *
 * @tsplus static ets/STM/Ops forEach
 */
export function forEach<A, R, E, B>(
  as: LazyArg<Collection<A>>,
  f: (a: A) => STM<R, E, B>
): STM<R, E, Chunk<B>> {
  return STM.suspend(() => {
    let stm = STM.succeedNow([]) as STM<R, E, B[]>;

    const as0 = as();
    for (const a of as0) {
      stm = stm.zipWith(f(a), (acc, b) => {
        acc.push(b);
        return acc;
      });
    }

    return stm.map(Chunk.from);
  });
}

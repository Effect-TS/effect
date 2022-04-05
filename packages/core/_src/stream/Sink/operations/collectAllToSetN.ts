/**
 * A sink that collects first `n` distinct inputs into a set.
 *
 * @tsplus static ets/Sink/Ops collectAllToSetN
 */
export function collectAllToSetN<In>(
  n: number
): Sink<unknown, never, In, In, HashSet<In>> {
  return Sink.foldWeighted(
    HashSet.empty(),
    (acc, in_) => (acc.has(in_) ? 0 : 1),
    n,
    (set, a) => set.add(a)
  );
}

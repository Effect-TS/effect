/**
 * A sink that collects first `n` keys into a map. The keys are calculated
 * from inputs using the keying function `key`; if multiple inputs use the the
 * same key, they are merged using the `f` function.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllToMapN
 */
export function collectAllToMapN<In, K>(
  n: number,
  key: (in_: In) => K,
  f: (in1: In, in2: In) => In
): Sink<never, never, In, In, HashMap<K, In>> {
  return Sink.foldWeighted(
    HashMap.empty<K, In>(),
    (acc, in_) => (acc.has(key(in_)) ? 0 : 1),
    n,
    (acc, in_) => {
      const k = key(in_)
      return acc.has(k) ? acc.update(k, (v) => f(v, in_)) : acc.set(k, in_)
    }
  )
}

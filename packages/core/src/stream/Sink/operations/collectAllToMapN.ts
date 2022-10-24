import { pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"

/**
 * A sink that collects first `n` keys into a map. The keys are calculated
 * from inputs using the keying function `key`; if multiple inputs use the the
 * same key, they are merged using the `f` function.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllToMapN
 * @category constructors
 * @since 1.0.0
 */
export function collectAllToMapN<In, K>(
  n: number,
  key: (in_: In) => K,
  f: (in1: In, in2: In) => In
): Sink<never, never, In, In, HashMap.HashMap<K, In>> {
  return Sink.foldWeighted(
    HashMap.empty<K, In>(),
    (map, input) => pipe(map, HashMap.has(key(input))) ? 0 : 1,
    n,
    (map, input) => {
      const k = key(input)
      return pipe(map, HashMap.has(k)) ?
        pipe(map, HashMap.update(k, (v) => f(v, input))) :
        pipe(map, HashMap.set(k, input))
    }
  )
}

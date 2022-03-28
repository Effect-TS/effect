import { HashMap } from "../../../collection/immutable/HashMap"
import { Sink } from "../definition"

/**
 * A sink that collects all of its inputs into a map. The keys are extracted
 * from inputs using the keying function `key`; if multiple inputs use the
 * same key, they are merged using the `f` function.
 *
 * @tsplus static ets/SinkOps collectAllToMap
 */
export function collectAllToMap<Err, In, K>(
  key: (in_: In) => K,
  f: (in1: In, in2: In) => In,
  __tsplusTrace?: string
): Sink<unknown, never, In, never, HashMap<K, In>> {
  return Sink.foldLeftChunks(HashMap.empty(), (acc, as) =>
    as.reduce(acc, (acc, a) => {
      const k = key(a)
      return acc.has(k) ? acc.update(k, (v) => f(v, a)) : acc.set(k, a)
    })
  )
}

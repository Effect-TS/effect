import * as Chunk from "@fp-ts/data/Chunk"
import { pipe } from "@fp-ts/data/Function"
import * as HashMap from "@fp-ts/data/HashMap"

/**
 * A sink that collects all of its inputs into a map. The keys are extracted
 * from inputs using the keying function `key`; if multiple inputs use the
 * same key, they are merged using the `f` function.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllToMap
 * @category constructors
 * @since 1.0.0
 */
export function collectAllToMap<In, K>(
  key: (in_: In) => K,
  f: (in1: In, in2: In) => In
): Sink<never, never, In, never, HashMap.HashMap<K, In>> {
  return Sink.foldLeftChunks(
    HashMap.empty<K, In>(),
    (map, chunk) =>
      pipe(
        chunk,
        Chunk.reduce(map, (map, a: In) => {
          const k = key(a)
          return pipe(map, HashMap.has(k)) ?
            pipe(map, HashMap.update(k, (v) => f(v, a))) :
            pipe(map, HashMap.set(k, a))
        })
      )
  )
}

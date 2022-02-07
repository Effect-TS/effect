// ets_tracing: off

import * as Chunk from "../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../Collections/Immutable/Tuple/index.js"

type RecursiveTuples<T> = Tp.Tuple<[T | RecursiveTuples<T>, T]>

function isTuple(t: unknown): t is Tp.Tuple<[unknown, unknown]> {
  return t instanceof Tp.Tuple && t.tuple.length === 2
}

export function flattenTuples<T>(tuples: RecursiveTuples<T>): Chunk.Chunk<T> {
  let result = Chunk.empty<T>()
  let {
    tuple: [a, b]
  } = tuples

  for (;;) {
    if (isTuple(a)) {
      result = Chunk.prepend_(result, b)
      ;[a, b] = a.tuple
    } else {
      result = Chunk.concat_(Chunk.concat_(Chunk.single(a), Chunk.single(b)), result)
      break
    }
  }

  return result
}

// ets_tracing: off

import * as A from "../../../../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../../../../Collections/Immutable/Tuple/index.js"
import * as E from "../../../../../Either/index.js"

export function zipChunks_<A, B, C>(
  fa: A.Chunk<A>,
  fb: A.Chunk<B>,
  f: (a: A, b: B) => C
): Tp.Tuple<[A.Chunk<C>, E.Either<A.Chunk<A>, A.Chunk<B>>]> {
  let fc = A.empty<C>()
  const len = Math.min(A.size(fa), A.size(fb))
  for (let i = 0; i < len; i++) {
    fc = A.append_(fc, f(A.unsafeGet_(fa, i), A.unsafeGet_(fb, i)))
  }

  if (A.size(fa) > A.size(fb)) {
    return Tp.tuple(fc, E.left(A.drop_(fa, A.size(fb))))
  }

  return Tp.tuple(fc, E.right(A.drop_(fb, A.size(fa))))
}

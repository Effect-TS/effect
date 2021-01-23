import * as A from "../../Chunk"
import * as E from "../../Either"

export function zipChunks_<A, B, C>(
  fa: A.Chunk<A>,
  fb: A.Chunk<B>,
  f: (a: A, b: B) => C
): [A.Chunk<C>, E.Either<A.Chunk<A>, A.Chunk<B>>] {
  const fc: C[] = []
  const len = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    fc[i] = f(fa[i], fb[i])
  }

  if (fa.length > fb.length) {
    return [fc, E.left(A.dropLeft_(fa, fb.length))]
  }

  return [fc, E.right(A.dropLeft_(fb, fa.length))]
}

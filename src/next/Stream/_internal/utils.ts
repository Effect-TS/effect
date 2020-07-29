import * as A from "../../../Array"
import * as E from "../../../Either"

export function zipChunks_<A, B, C>(
  fa: A.Array<A>,
  fb: A.Array<B>,
  f: (a: A, b: B) => C
): [A.Array<C>, E.Either<A.Array<A>, A.Array<B>>] {
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

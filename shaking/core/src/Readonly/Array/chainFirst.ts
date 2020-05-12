import { chain_ } from "./chain_"
import { map_ } from "./map_"

export const chainFirst: <A, B>(
  f: (a: A) => readonly B[]
) => (ma: readonly A[]) => readonly A[] = (f) => (ma) =>
  chain_(ma, (a) => map_(f(a), () => a))

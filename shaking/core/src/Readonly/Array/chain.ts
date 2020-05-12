import { chain_ } from "./chain_"

export const chain: <A, B>(
  f: (a: A) => readonly B[]
) => (ma: readonly A[]) => readonly B[] = (f) => (ma) => chain_(ma, f)

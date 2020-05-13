import { chainFirst as chainFirst_1 } from "../Readonly/Array/chainFirst"

export const chainFirst: <A, B>(
  f: (a: A) => B[]
) => (ma: A[]) => A[] = chainFirst_1 as any

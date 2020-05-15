import { reduce as reduce_1 } from "../Readonly/Record"

export const reduce: <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => (fa: Record<string, A>) => B = reduce_1

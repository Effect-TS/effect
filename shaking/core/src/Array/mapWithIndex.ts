import { mapWithIndex as mapWithIndex_1 } from "../Readonly/Array/mapWithIndex"

export const mapWithIndex: <A, B>(
  f: (i: number, a: A) => B
) => (fa: A[]) => B[] = mapWithIndex_1 as any

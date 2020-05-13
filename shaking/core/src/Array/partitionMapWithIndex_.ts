import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either/Either"
import { partitionMapWithIndex_ as partitionMapWithIndex__1 } from "../Readonly/Array/partitionMapWithIndex_"

export const partitionMapWithIndex_: <A, B, C>(
  fa: A[],
  f: (i: number, a: A) => Either<B, C>
) => Separated<B[], C[]> = partitionMapWithIndex__1 as any

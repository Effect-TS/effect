import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either/Either"
import { partitionMapWithIndex as partitionMapWithIndex_1 } from "../Readonly/Array/partitionMapWithIndex"

export const partitionMapWithIndex: <A, B, C>(
  f: (i: number, a: A) => Either<B, C>
) => (fa: A[]) => Separated<B[], C[]> = partitionMapWithIndex_1 as any

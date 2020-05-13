import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either/Either"
import { partitionMap as partitionMap_1 } from "../Readonly/Array/partitionMap"

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: A[]) => Separated<B[], C[]> = partitionMap_1 as any

import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either/Either"
import { partitionMap_ as partitionMap__1 } from "../Readonly/Array/partitionMap_"

export const partitionMap_: <A, B, C>(
  fa: A[],
  f: (a: A) => Either<B, C>
) => Separated<B[], C[]> = partitionMap__1 as any

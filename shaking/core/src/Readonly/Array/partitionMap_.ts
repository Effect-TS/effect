import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either/Either"

import { partitionMapWithIndex_ } from "./partitionMapWithIndex_"

export const partitionMap_: <A, B, C>(
  fa: readonly A[],
  f: (a: A) => Either<B, C>
) => Separated<readonly B[], readonly C[]> = (fa, f) =>
  partitionMapWithIndex_(fa, (_, a) => f(a))

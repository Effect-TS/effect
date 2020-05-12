import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either/Either"

import { partitionMapWithIndex_ } from "./partitionMapWithIndex_"

export const partitionMapWithIndex: <A, B, C>(
  f: (i: number, a: A) => Either<B, C>
) => (fa: readonly A[]) => Separated<readonly B[], readonly C[]> = (f) => (fa) =>
  partitionMapWithIndex_(fa, f)

import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either/Either"

import { partitionMap_ } from "./partitionMap_"

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (fa: readonly A[]) => Separated<readonly B[], readonly C[]> = (f) => (fa) =>
  partitionMap_(fa, f)

import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either"

import { partitionMapWithIndex_ } from "./partitionMapWithIndex_"

export const partitionMap_: <E, A, B, C>(
  fa: ReadonlyMap<E, A>,
  f: (a: A) => Either<B, C>
) => Separated<ReadonlyMap<E, B>, ReadonlyMap<E, C>> = (fa, f) =>
  partitionMapWithIndex_(fa, (_, a) => f(a))

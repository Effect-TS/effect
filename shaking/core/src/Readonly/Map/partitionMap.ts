import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either"

import { partitionMap_ } from "./partitionMap_"

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => <E>(fa: ReadonlyMap<E, A>) => Separated<ReadonlyMap<E, B>, ReadonlyMap<E, C>> = (
  f
) => (fa) => partitionMap_(fa, f)

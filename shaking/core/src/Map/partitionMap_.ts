import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import * as RM from "../Readonly/Map/partitionMap_"

export const partitionMap_: <E, A, B, C>(
  fa: Map<E, A>,
  f: (a: A) => Either<B, C>
) => Separated<Map<E, B>, Map<E, C>> = RM.partitionMap_ as any

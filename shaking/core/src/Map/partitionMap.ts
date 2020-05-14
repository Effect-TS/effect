import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import * as RM from "../Readonly/Map/partitionMap"

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => <E>(fa: Map<E, A>) => Separated<Map<E, B>, Map<E, C>> = RM.partitionMap as any

import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import * as RM from "../Readonly/Map/separate"

export const separate: <E, A, B>(
  fa: Map<E, Either<A, B>>
) => Separated<Map<E, A>, Map<E, B>> = RM.separate as any

import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import { partitionMap as partitionMap_1 } from "../Readonly/Record"

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (
  fa: Record<string, A>
) => Separated<Record<string, B>, Record<string, C>> = partitionMap_1

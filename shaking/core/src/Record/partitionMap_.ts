import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import { partitionMap_ as partitionMap__1 } from "../Readonly/Record"

export const partitionMap_: <A, B, C>(
  fa: Record<string, A>,
  f: (a: A) => Either<B, C>
) => Separated<Record<string, B>, Record<string, C>> = partitionMap__1

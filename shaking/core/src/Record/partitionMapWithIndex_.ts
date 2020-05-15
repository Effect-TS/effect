import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../Either"
import { partitionMapWithIndex_ as partitionMapWithIndex__1 } from "../Readonly/Record"

export const partitionMapWithIndex_: <A, B, C>(
  fa: Record<string, A>,
  f: (i: string, a: A) => Either<B, C>
) => Separated<Record<string, B>, Record<string, C>> = partitionMapWithIndex__1

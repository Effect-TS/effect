import type { Separated } from "fp-ts/lib/Compactable"

import type { Either } from "../../Either"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { partitionMap_ } from "./partitionMap_"

export const partitionMap: <A, B, C>(
  f: (a: A) => Either<B, C>
) => (
  fa: ReadonlyRecord<string, A>
) => Separated<ReadonlyRecord<string, B>, ReadonlyRecord<string, C>> = (f) => (fa) =>
  partitionMap_(fa, f)

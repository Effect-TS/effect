import type { Separated } from "fp-ts/lib/Compactable"

import type { Predicate } from "../../Function"

import type { ReadonlyRecord } from "./ReadonlyRecord"
import { partitionWithIndex_ } from "./partitionWithIndex_"

export const partition_ = <A>(
  fa: ReadonlyRecord<string, A>,
  predicate: Predicate<A>
): Separated<ReadonlyRecord<string, A>, ReadonlyRecord<string, A>> => {
  return partitionWithIndex_(fa, (_, a) => predicate(a))
}

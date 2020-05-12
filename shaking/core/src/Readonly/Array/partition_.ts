import type { Separated } from "fp-ts/lib/Compactable"

import type { Predicate } from "../../Function"

import { partitionWithIndex_ } from "./partitionWithIndex_"

export const partition_ = <A>(
  fa: ReadonlyArray<A>,
  predicate: Predicate<A>
): Separated<ReadonlyArray<A>, ReadonlyArray<A>> => {
  return partitionWithIndex_(fa, (_, a) => predicate(a))
}

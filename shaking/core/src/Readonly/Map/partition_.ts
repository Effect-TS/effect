import type { Separated } from "fp-ts/lib/Compactable"
import type { Partition2 } from "fp-ts/lib/Filterable"

import type { Predicate } from "../../Function"

import { URI } from "./URI"
import { partitionWithIndex_ } from "./partitionWithIndex_"

export const partition_: Partition2<URI> = <K, A>(
  fa: ReadonlyMap<K, A>,
  predicate: Predicate<A>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>> =>
  partitionWithIndex_(fa, (_, a) => predicate(a))

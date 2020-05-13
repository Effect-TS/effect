import type { PartitionWithIndex1 } from "fp-ts/lib/FilterableWithIndex"

import { partitionWithIndex_ as partitionWithIndex__1 } from "../Readonly/Array/partitionWithIndex_"

import { URI } from "./URI"

export const partitionWithIndex_: PartitionWithIndex1<
  URI,
  number
> = partitionWithIndex__1 as any

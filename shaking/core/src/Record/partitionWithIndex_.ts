import type { PartitionWithIndex1 } from "fp-ts/lib/FilterableWithIndex"

import { partitionWithIndex_ as partitionWithIndex__1 } from "../Readonly/Record"

import { URI } from "./URI"

export const partitionWithIndex_: PartitionWithIndex1<
  URI,
  string
> = partitionWithIndex__1

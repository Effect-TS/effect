import type { TraverseWithIndex1 } from "fp-ts/lib/TraversableWithIndex"

import { traverseWithIndex_ as traverseWithIndex__1 } from "../Readonly/Array/traverseWithIndex_"

import { URI } from "./URI"

export const traverseWithIndex_: TraverseWithIndex1<
  URI,
  number
> = traverseWithIndex__1 as any

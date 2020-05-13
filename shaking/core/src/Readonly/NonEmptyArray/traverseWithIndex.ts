import { TraverseWithIndex1 } from "fp-ts/lib/TraversableWithIndex"

import { traverseWithIndex as traverseWithIndex_1 } from "../Array"

import { URI } from "./URI"

export const traverseWithIndex: TraverseWithIndex1<
  URI,
  number
> = traverseWithIndex_1 as any

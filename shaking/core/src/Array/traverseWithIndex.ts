import type { TraverseWithIndex1 } from "fp-ts/lib/TraversableWithIndex"

import { traverseWithIndex as traverseWithIndex__1 } from "../Readonly/Array/traverseWithIndex"

import { URI } from "./URI"

export const traverseWithIndex: TraverseWithIndex1<
  URI,
  number
> = traverseWithIndex__1 as any

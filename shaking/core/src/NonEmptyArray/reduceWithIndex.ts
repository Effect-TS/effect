import { reduceWithIndex as reduceWithIndex_1 } from "../Readonly/NonEmptyArray/reduceWithIndex"

import type { NonEmptyArray } from "./NonEmptyArray"

export const reduceWithIndex: <A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
) => (fa: NonEmptyArray<A>) => B = reduceWithIndex_1 as any

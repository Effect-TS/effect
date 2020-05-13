import { reduceRightWithIndex as reduceRightWithIndex_1 } from "../Readonly/NonEmptyArray/reduceRightWithIndex"

import type { NonEmptyArray } from "./NonEmptyArray"

export const reduceRightWithIndex: <A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
) => (fa: NonEmptyArray<A>) => B = reduceRightWithIndex_1 as any

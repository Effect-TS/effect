import type { Monoid } from "../Monoid/Monoid"
import { foldMapWithIndex_ as foldMapWithIndex__1 } from "../Readonly/NonEmptyArray/foldMapWithIndex_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const foldMapWithIndex_: <M>(
  M: Monoid<M>
) => <A>(fa: NonEmptyArray<A>, f: (i: number, a: A) => M) => M = foldMapWithIndex__1

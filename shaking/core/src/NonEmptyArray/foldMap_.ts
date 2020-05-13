import type { Monoid } from "../Monoid/Monoid"
import { foldMap_ as foldMap__1 } from "../Readonly/NonEmptyArray/foldMap_"

import type { NonEmptyArray } from "./NonEmptyArray"

export const foldMap_: <M>(
  M: Monoid<M>
) => <A>(fa: NonEmptyArray<A>, f: (a: A) => M) => M = foldMap__1 as any

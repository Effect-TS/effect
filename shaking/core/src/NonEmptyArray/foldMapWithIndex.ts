import { foldMapWithIndex as foldMapWithIndex_1 } from "../Readonly/NonEmptyArray/foldMapWithIndex"
import type { Semigroup } from "../Semigroup"

import type { NonEmptyArray } from "./NonEmptyArray"

export const foldMapWithIndex: <S>(
  S: Semigroup<S>
) => <A>(f: (i: number, a: A) => S) => (fa: NonEmptyArray<A>) => S = foldMapWithIndex_1

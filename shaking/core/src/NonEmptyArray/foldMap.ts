import { foldMap as foldMap_1 } from "../Readonly/NonEmptyArray/foldMap"
import type { Semigroup } from "../Semigroup"

import type { NonEmptyArray } from "./NonEmptyArray"

export const foldMap: <S>(
  S: Semigroup<S>
) => <A>(f: (a: A) => S) => (fa: NonEmptyArray<A>) => S = foldMap_1

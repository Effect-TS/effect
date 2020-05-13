import { fold as fold_1 } from "../Readonly/NonEmptyArray/fold"
import type { Semigroup } from "../Semigroup"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.5.0
 */
export const fold: <A>(S: Semigroup<A>) => (fa: NonEmptyArray<A>) => A = fold_1

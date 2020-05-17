import { identity } from "../Function"
import type { Monoid } from "../Monoid"

import type { Const } from "./Const"

export const getMonoid: <E, A>(M: Monoid<E>) => Monoid<Const<E, A>> = identity as any

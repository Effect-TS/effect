import { identity } from "../Function"
import type { Bounded } from "../Ord"

import type { Const } from "./Const"

export const getBounded: <E, A>(B: Bounded<E>) => Bounded<Const<E, A>> = identity as any

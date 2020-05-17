import { identity } from "../Function"
import type { Ord } from "../Ord"

import type { Const } from "./Const"

export const getOrd: <E, A>(O: Ord<E>) => Ord<Const<E, A>> = identity

import type { Eq } from "../Eq"
import { identity } from "../Function"

import type { Const } from "./Const"

export const getEq: <E, A>(E: Eq<E>) => Eq<Const<E, A>> = identity

import type { Ring } from "fp-ts/lib/Ring"

import { identity } from "../Function"

import type { Const } from "./Const"

export const getRing: <E, A>(S: Ring<E>) => Ring<Const<E, A>> = identity as any

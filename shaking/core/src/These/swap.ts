import type { These } from "fp-ts/lib/These"

import { both } from "./both"
import { fold } from "./fold"
import { left } from "./left"
import { right } from "./right"

export const swap: <E, A>(fa: These<E, A>) => These<A, E> = fold(right, left, (e, a) =>
  both(a, e)
)

import { fromEffect } from "../Managed/fromEffect"
import { makeExit_ } from "../Managed/makeExit_"
import { Managed } from "../Managed/managed"

import { Effect } from "./effect"

export const toManaged = <A = unknown, S = never, R = unknown>(
  release?: (a: A) => Effect<S, R, never, any>
) => <S1, R1, E1, A1 extends A>(
  self: Effect<S1, R1, E1, A1>
): Managed<S | S1, R1 & R, E1, A1> =>
  release ? makeExit_(self, (a) => release(a)) : fromEffect(self)

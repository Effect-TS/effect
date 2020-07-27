import { fromEffect } from "../Managed/fromEffect"
import { makeExit_ } from "../Managed/makeExit_"

import { Effect } from "./effect"

export const toManaged = <A = unknown, S = never, R = unknown>(
  release?: (a: A) => Effect<S, R, never, any>
) => <S, R, E, A1 extends A>(self: Effect<S, R, E, A1>) =>
  release ? makeExit_(self, (a) => release(a)) : fromEffect(self)

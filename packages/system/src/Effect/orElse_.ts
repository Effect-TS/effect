import type { Effect } from "./effect"
import { ISucceed } from "./primitives"
import { tryOrElse_ } from "./tryOrElse_"

export const orElse_ = <S, R, E, A, S2, R2, E2, A2>(
  self: Effect<S, R, E, A>,
  that: () => Effect<S2, R2, E2, A2>
) => tryOrElse_(self, that, (a) => new ISucceed(a))

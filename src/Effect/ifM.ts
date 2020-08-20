import { chain_ } from "./core"
import type { Effect } from "./effect"

export const ifM = <S, R, E>(b: Effect<S, R, E, boolean>) => <S1, R1, E1, A1>(
  onTrue: () => Effect<S1, R1, E1, A1>
) => <S2, R2, E2, A2>(
  onFalse: () => Effect<S2, R2, E2, A2>
): Effect<S | S1 | S2, R & R1 & R2, E | E1 | E2, A1 | A2> =>
  chain_(b, (x) =>
    x ? (onTrue() as Effect<S | S1 | S2, R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()
  )

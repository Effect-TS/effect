import { chain_ } from "./core"
import type { Effect } from "./effect"

export function ifM<R, E>(b: Effect<R, E, boolean>) {
  return <R1, E1, A1>(onTrue: () => Effect<R1, E1, A1>) => <R2, E2, A2>(
    onFalse: () => Effect<R2, E2, A2>
  ): Effect<R & R1 & R2, E | E1 | E2, A1 | A2> =>
    chain_(b, (x) =>
      x ? (onTrue() as Effect<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()
    )
}

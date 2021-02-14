import { chain_ } from "../core"
import type { Managed } from "../managed"
import { succeed } from "../succeed"

export function ifM<R1, E1, A1, R2, E2, A2>(
  onTrue: () => Managed<R1, E1, A1>,
  onFalse: () => Managed<R2, E2, A2>
) {
  return <R, E>(b: Managed<R, E, boolean>) => ifM_(b, onTrue, onFalse)
}

export function ifM_<R, E, R1, E1, A1, R2, E2, A2>(
  b: Managed<R, E, boolean>,
  onTrue: () => Managed<R1, E1, A1>,
  onFalse: () => Managed<R2, E2, A2>
) {
  return chain_(b, (x) =>
    x ? (onTrue() as Managed<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()
  )
}

function _if<R1, E1, A1, R2, E2, A2>(
  onTrue: () => Managed<R1, E1, A1>,
  onFalse: () => Managed<R2, E2, A2>
) {
  return (b: boolean) => _if_(b, onTrue, onFalse)
}

function _if_<R1, E1, A1, R2, E2, A2>(
  b: boolean,
  onTrue: () => Managed<R1, E1, A1>,
  onFalse: () => Managed<R2, E2, A2>
) {
  return ifM_(succeed(b), onTrue, onFalse)
}

export { _if as if, _if_ as if_ }

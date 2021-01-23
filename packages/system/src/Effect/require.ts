import * as O from "../Option"
import { chain_, effectTotal, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

function require_<E>(error: () => E) {
  return <R, A>(io: Effect<R, E, O.Option<A>>) => require__(io, error)
}

function require__<R, A, E>(io: Effect<R, E, O.Option<A>>, error: () => E) {
  return chain_(
    io,
    O.fold(() => chain_(effectTotal(error), fail), succeed)
  )
}

export { require_ as require, require__ as require_ }

import * as A from "../Array/core"
import { map as mapCause } from "../Cause"
import { pipe } from "../Function"
import * as O from "../Option"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

export function head<R, E, A>(
  self: Effect<R, E, readonly A[]>
): Effect<R, O.Option<E>, O.Option<A>> {
  return foldCauseM_(
    self,
    (x) => pipe(x, mapCause(O.some), halt),
    (x) =>
      pipe(
        x,
        A.head,
        O.fold(
          () => fail(O.none),
          (x) => pipe(x, O.some, succeed)
        )
      )
  )
}

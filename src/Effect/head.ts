import * as A from "../Array"
import { map as mapCause } from "../Cause"
import { flow } from "../Function"
import * as O from "../Option"
import { foldCauseM_, halt, succeed } from "./core"
import type { Effect } from "./effect"
import { fail } from "./fail"

export function head<R, E, A>(
  self: Effect<R, E, readonly A[]>
): Effect<R, O.Option<E>, O.Option<A>> {
  return foldCauseM_(
    self,
    flow(mapCause(O.some), halt),
    flow(
      A.head,
      O.fold(() => fail(O.none), flow(O.some, succeed))
    )
  )
}

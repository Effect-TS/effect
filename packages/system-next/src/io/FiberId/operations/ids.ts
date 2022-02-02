import * as HS from "../../../collection/immutable/HashSet"
import { IO } from "../../../io-light/IO"
import type { FiberId } from "../definition"
import { realFiberId } from "../definition"

/**
 * Get the set of identifiers for this `FiberId`.
 *
 * @tsplus getter ets/FiberId ids
 */
export function ids(self: FiberId): HS.HashSet<number> {
  return idsSafe(self).run()
}

function idsSafe(self: FiberId): IO<HS.HashSet<number>> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return IO.succeed(HS.make())
    }
    case "Runtime": {
      return IO.succeed(
        HS.mutate_(HS.make(), (set) => {
          HS.add_(set, self.id)
        })
      )
    }
    case "Composite": {
      let base = IO.succeed(HS.make<number>())
      for (const fiberId of self.fiberIds) {
        base = IO.suspend(idsSafe(fiberId)).zipWith(base, HS.union_)
      }
      return base
    }
  }
}

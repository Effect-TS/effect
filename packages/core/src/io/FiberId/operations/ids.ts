import { HashSet } from "../../../collection/immutable/HashSet"
import { IO } from "../../../io-light/IO"
import type { FiberId } from "../definition"
import { realFiberId } from "../definition"

/**
 * Get the set of identifiers for this `FiberId`.
 *
 * @tsplus getter ets/FiberId ids
 */
export function ids(self: FiberId): HashSet<number> {
  return idsSafe(self).run()
}

function idsSafe(self: FiberId): IO<HashSet<number>> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return IO.succeed(HashSet())
    }
    case "Runtime": {
      return IO.succeed(HashSet.from([self.id]))
    }
    case "Composite": {
      let base = IO.succeed(HashSet<number>())
      for (const fiberId of self.fiberIds) {
        base = IO.suspend(idsSafe(fiberId)).zipWith(base, (a, b) => a | b)
      }
      return base
    }
  }
}

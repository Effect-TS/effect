import * as HS from "../../../collection/immutable/HashSet"
import * as IO from "../../../io-light/IO"
import type { FiberId } from "../definition"

/**
 * Get the set of identifiers for this `FiberId`.
 */
export function ids(self: FiberId): HS.HashSet<number> {
  return IO.run(idsSafe(self))
}

function idsSafe(self: FiberId): IO.IO<HS.HashSet<number>> {
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
        base = IO.zipWith_(
          IO.suspend(() => idsSafe(fiberId)),
          base,
          HS.union_
        )
      }
      return base
    }
  }
}

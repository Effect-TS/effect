import { realFiberId } from "@effect/core/io/FiberId/definition"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as SafeEval from "@fp-ts/data/SafeEval"

/**
 * Get the set of identifiers for this `FiberId`.
 *
 * @tsplus getter effect/core/io/FiberId ids
 * @category destructors
 * @since 1.0.0
 */
export function ids(self: FiberId): HashSet.HashSet<number> {
  return SafeEval.execute(idsSafe(self))
}

function idsSafe(self: FiberId): SafeEval.SafeEval<HashSet.HashSet<number>> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return SafeEval.succeed(HashSet.empty())
    }
    case "Runtime": {
      return SafeEval.succeed(HashSet.from([self.id]))
    }
    case "Composite": {
      let base = SafeEval.succeed(HashSet.empty<number>())
      for (const fiberId of self.fiberIds) {
        base = pipe(
          SafeEval.suspend(() => idsSafe(fiberId)),
          SafeEval.zipWith(base, (a, b) => pipe(a, HashSet.union(b)))
        )
      }
      return base
    }
  }
}

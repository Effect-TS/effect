import { realFiberId } from "@effect/core/io/FiberId/definition"

/**
 * Get the set of identifiers for this `FiberId`.
 *
 * @tsplus getter effect/core/io/FiberId ids
 */
export function ids(self: FiberId): HashSet<number> {
  return idsSafe(self).run
}

function idsSafe(self: FiberId): Eval<HashSet<number>> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return Eval.succeed(HashSet())
    }
    case "Runtime": {
      return Eval.succeed(HashSet.from([self.id]))
    }
    case "Composite": {
      let base = Eval.succeed(HashSet.empty<number>())
      for (const fiberId of self.fiberIds) {
        base = Eval.suspend(idsSafe(fiberId)).zipWith(base, (a, b) => a.union(b))
      }
      return base
    }
  }
}

import type { None } from "@effect/core/io/FiberId/definition"
import { realFiberId } from "@effect/core/io/FiberId/definition"

/**
 * Determines if the `FiberId` is a `None`.
 *
 * @tsplus fluent effect/core/io/FiberId isNone
 */
export function isNone(self: FiberId): self is None {
  return isNoneSafe(self).run
}

function isNoneSafe(self: FiberId): Eval<boolean> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return Eval.succeed(true)
    }
    case "Runtime": {
      return Eval.succeed(false)
    }
    case "Composite": {
      let base = Eval.succeed(true)
      for (const fiberId of self.fiberIds) {
        base = Eval.suspend(isNoneSafe(fiberId)).zipWith(base, (a, b) => a && b)
      }
      return base
    }
  }
}

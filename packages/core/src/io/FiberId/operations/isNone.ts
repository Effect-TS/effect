import type { None } from "@effect/core/io/FiberId/definition"
import { realFiberId } from "@effect/core/io/FiberId/definition"
import { pipe } from "@fp-ts/data/Function"
import * as SafeEval from "@fp-ts/data/SafeEval"

/**
 * Determines if the `FiberId` is a `None`.
 *
 * @tsplus fluent effect/core/io/FiberId isNone
 * @category refinements
 * @since 1.0.0
 */
export function isNone(self: FiberId): self is None {
  return SafeEval.execute(isNoneSafe(self))
}

function isNoneSafe(self: FiberId): SafeEval.SafeEval<boolean> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return SafeEval.succeed(true)
    }
    case "Runtime": {
      return SafeEval.succeed(false)
    }
    case "Composite": {
      let base = SafeEval.succeed(true)
      for (const fiberId of self.fiberIds) {
        base = SafeEval.suspend(() =>
          pipe(
            isNoneSafe(fiberId),
            SafeEval.zipWith(base, (a, b) => a && b)
          )
        )
      }
      return base
    }
  }
}

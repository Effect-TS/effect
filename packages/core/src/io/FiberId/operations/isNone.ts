import { IO } from "../../../io-light/IO"
import type { FiberId, None } from "../definition"
import { realFiberId } from "../definition"

/**
 * Determines if the `FiberId` is a `None`.
 *
 * @tsplus fluent ets/FiberId isNone
 */
export function isNone(self: FiberId): self is None {
  return isNoneSafe(self).run()
}

function isNoneSafe(self: FiberId): IO<boolean> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return IO.succeed(true)
    }
    case "Runtime": {
      return IO.succeed(false)
    }
    case "Composite": {
      let base = IO.succeed(true)
      for (const fiberId of self.fiberIds) {
        base = IO.suspend(isNoneSafe(fiberId)).zipWith(base, (a, b) => a && b)
      }
      return base
    }
  }
}

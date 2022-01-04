// ets_tracing: off

import * as IO from "../../IO"
import type { FiberId, None } from "../definition"

/**
 * Determines if the `FiberId` is a `None`.
 */
export function isNone(self: FiberId): self is None {
  return IO.run(isNoneSafe(self))
}

function isNoneSafe(self: FiberId): IO.IO<boolean> {
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
        base = IO.zipWith_(
          IO.suspend(() => isNoneSafe(fiberId)),
          base,
          (a, b) => a && b
        )
      }
      return base
    }
  }
}

// ets_tracing: off

import * as HS from "../../Collections/Immutable/HashSet"
import * as IO from "../../IO"
import * as O from "../../Option"
import type { FiberId } from "../definition"
import { combineAll } from "./combineAll"

/**
 * Convert a `FiberId` into an `Option<FiberId>`.
 */
export function toOption(self: FiberId): O.Option<FiberId> {
  return IO.run(toOptionSafe(self))
}

function toOptionSafe(self: FiberId): IO.IO<O.Option<FiberId>> {
  switch (self._tag) {
    case "None": {
      return IO.succeed(O.none)
    }
    case "Runtime": {
      return IO.succeed(O.some(self))
    }
    case "Composite": {
      let base = IO.succeed(HS.make<FiberId>())
      for (const fiberId of self.fiberIds) {
        base = IO.zipWith_(
          base,
          IO.suspend(() => toOptionSafe(fiberId)),
          (fiberIds, optionFiberId) =>
            optionFiberId._tag === "Some"
              ? HS.add_(fiberIds, optionFiberId.value)
              : fiberIds
        )
      }
      return IO.map_(base, (fiberIds) =>
        HS.size(fiberIds) === 0 ? O.none : O.some(combineAll(fiberIds))
      )
    }
  }
}

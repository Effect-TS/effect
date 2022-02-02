import * as HS from "../../../collection/immutable/HashSet"
import { Option } from "../../../data/Option"
import { IO } from "../../../io-light/IO"
import type { FiberId } from "../definition"
import { realFiberId } from "../definition"
import { combineAll } from "./combineAll"

/**
 * Convert a `FiberId` into an `Option<FiberId>`.
 */
export function toOption(self: FiberId): Option<FiberId> {
  return toOptionSafe(self).run()
}

function toOptionSafe(self: FiberId): IO<Option<FiberId>> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return IO.succeed(Option.none)
    }
    case "Runtime": {
      return IO.succeed(Option.some(self))
    }
    case "Composite": {
      let base = IO.succeed(HS.make<FiberId>())
      for (const fiberId of self.fiberIds) {
        base = base.zipWith(
          IO.suspend(toOptionSafe(fiberId)),
          (fiberIds, optionFiberId) =>
            optionFiberId._tag === "Some"
              ? HS.add_(fiberIds, optionFiberId.value)
              : fiberIds
        )
      }
      return base.map((fiberIds) =>
        HS.size(fiberIds) === 0 ? Option.none : Option.some(combineAll(fiberIds))
      )
    }
  }
}

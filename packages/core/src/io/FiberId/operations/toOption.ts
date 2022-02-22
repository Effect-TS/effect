import { HashSet } from "../../../collection/immutable/HashSet"
import { Option } from "../../../data/Option"
import { IO } from "../../../io-light/IO"
import { FiberId, realFiberId } from "../definition"

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
      let base = IO.succeed(HashSet<FiberId>())
      for (const fiberId of self.fiberIds) {
        base = base.zipWith(
          IO.suspend(toOptionSafe(fiberId)),
          (fiberIds, optionFiberId) =>
            optionFiberId._tag === "Some" ? fiberIds.add(optionFiberId.value) : fiberIds
        )
      }
      return base.map((fiberIds) =>
        fiberIds.size === 0 ? Option.none : Option.some(FiberId.combineAll(fiberIds))
      )
    }
  }
}

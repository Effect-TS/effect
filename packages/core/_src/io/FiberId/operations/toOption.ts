import { realFiberId } from "@effect/core/io/FiberId/definition"

/**
 * Convert a `FiberId` into an `Option<FiberId>`.
 */
export function toOption(self: FiberId): Option<FiberId> {
  return toOptionSafe(self).run
}

function toOptionSafe(self: FiberId): Eval<Option<FiberId>> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return Eval.succeed(Option.none)
    }
    case "Runtime": {
      return Eval.succeed(Option.some(self))
    }
    case "Composite": {
      let base = Eval.succeed(HashSet.empty<FiberId>())
      for (const fiberId of self.fiberIds) {
        base = base.zipWith(
          Eval.suspend(toOptionSafe(fiberId)),
          (fiberIds, optionFiberId) => optionFiberId._tag === "Some" ? fiberIds.add(optionFiberId.value) : fiberIds
        )
      }
      return base.map((fiberIds) => fiberIds.size === 0 ? Option.none : Option.some(FiberId.combineAll(fiberIds)))
    }
  }
}

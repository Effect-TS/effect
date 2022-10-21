import { realFiberId } from "@effect/core/io/FiberId/definition"

/**
 * Convert a `FiberId` into an `Maybe<FiberId>`.
 *
 * @tsplus getter effect/core/io/FiberId toMaybe
 */
export function toMaybe(self: FiberId): Maybe<FiberId> {
  return toMaybeSafe(self).run
}

function toMaybeSafe(self: FiberId): Eval<Maybe<FiberId>> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return Eval.succeed(Maybe.none)
    }
    case "Runtime": {
      return Eval.succeed(Maybe.some(self))
    }
    case "Composite": {
      let base = Eval.succeed(HashSet.empty<FiberId>())
      for (const fiberId of self.fiberIds) {
        base = base.zipWith(
          Eval.suspend(toMaybeSafe(fiberId)),
          (fiberIds, optionFiberId) =>
            optionFiberId._tag === "Some" ? fiberIds.add(optionFiberId.value) : fiberIds
        )
      }
      return base.map((fiberIds) =>
        fiberIds.size === 0 ? Maybe.none : Maybe.some(FiberId.combineAll(fiberIds))
      )
    }
  }
}

import { realFiberId } from "@effect/core/io/FiberId/definition"
import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as Option from "@fp-ts/data/Option"
import * as SafeEval from "@fp-ts/data/SafeEval"

/**
 * Convert a `FiberId` into an `Option<FiberId>`.
 *
 * @tsplus getter effect/core/io/FiberId toOption
 * @category destructors
 * @since 1.0.0
 */
export function toOption(self: FiberId): Option.Option<FiberId> {
  return SafeEval.execute(toOptionSafe(self))
}

function toOptionSafe(self: FiberId): SafeEval.SafeEval<Option.Option<FiberId>> {
  realFiberId(self)
  switch (self._tag) {
    case "None": {
      return SafeEval.succeed(Option.none)
    }
    case "Runtime": {
      return SafeEval.succeed(Option.some(self))
    }
    case "Composite": {
      let base = SafeEval.succeed(HashSet.empty<FiberId>())
      for (const fiberId of self.fiberIds) {
        base = pipe(
          base,
          SafeEval.zipWith(
            SafeEval.suspend(() => toOptionSafe(fiberId)),
            (fiberIds, optionFiberId) =>
              optionFiberId._tag === "Some" ?
                pipe(fiberIds, HashSet.add(optionFiberId.value)) :
                fiberIds
          )
        )
      }
      return pipe(
        base,
        SafeEval.map((fiberIds) =>
          HashSet.size(fiberIds) === 0 ?
            Option.none :
            Option.some(FiberId.combineAll(fiberIds))
        )
      )
    }
  }
}

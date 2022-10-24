import { realCause } from "@effect/core/io/Cause/definition"
import { pipe } from "@fp-ts/data/Function"
import type * as Option from "@fp-ts/data/Option"
import * as SafeEval from "@fp-ts/data/SafeEval"

/**
 * Finds something and extracts some details from it.
 *
 * @tsplus static effect/core/io/Cause.Aspects find
 * @tsplus pipeable effect/core/io/Cause find
 * @category destructors
 * @since 1.0.0
 */
export function find<E, Z>(f: (cause: Cause<E>) => Option.Option<Z>) {
  return (self: Cause<E>): Option.Option<Z> => SafeEval.execute(findSafe(self, f))
}

function findSafe<E, Z>(
  self: Cause<E>,
  f: (cause: Cause<E>) => Option.Option<Z>
): SafeEval.SafeEval<Option.Option<Z>> {
  const result = f(self)
  if (result._tag === "Some") {
    return SafeEval.succeed(result)
  }
  realCause(self)
  switch (self._tag) {
    case "Both":
    case "Then": {
      return pipe(
        SafeEval.suspend(() => findSafe(self.left, f)),
        SafeEval.flatMap((leftResult) =>
          leftResult._tag === "Some" ? SafeEval.succeed(leftResult) : findSafe(self.right, f)
        )
      )
    }
    case "Stackless": {
      return SafeEval.suspend(() => findSafe(self.cause, f))
    }
    default: {
      return SafeEval.succeed(result)
    }
  }
}

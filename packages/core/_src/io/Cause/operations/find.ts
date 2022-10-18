import { realCause } from "@effect/core/io/Cause/definition"

/**
 * Finds something and extracts some details from it.
 *
 * @tsplus static effect/core/io/Cause.Aspects find
 * @tsplus pipeable effect/core/io/Cause find
 */
export function find<E, Z>(f: (cause: Cause<E>) => Maybe<Z>) {
  return (self: Cause<E>): Maybe<Z> => findSafe(self, f).run
}

function findSafe<E, Z>(
  self: Cause<E>,
  f: (cause: Cause<E>) => Maybe<Z>
): Eval<Maybe<Z>> {
  const result = f(self)
  if (result._tag === "Some") {
    return Eval.succeed(result)
  }
  realCause(self)
  switch (self._tag) {
    case "Annotated": {
      return Eval.suspend(findSafe(self.cause, f))
    }
    case "Both":
    case "Then": {
      return Eval.suspend(findSafe(self.left, f)).flatMap((leftResult) =>
        leftResult._tag === "Some" ? Eval.succeedNow(leftResult) : findSafe(self.right, f)
      ) as Eval<Maybe<Z>>
    }
    default: {
      return Eval.succeed(result)
    }
  }
}

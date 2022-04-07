import { realCause } from "@effect/core/io/Cause/definition";

/**
 * Finds something and extracts some details from it.
 *
 * @tsplus fluent ets/Cause find
 */
export function find_<E, Z>(
  self: Cause<E>,
  f: (cause: Cause<E>) => Option<Z>
): Option<Z> {
  return findSafe(self, f).run();
}

/**
 * Finds something and extracts some details from it.
 *
 * @tsplus static ets/Cause/Aspects find
 */
export const find = Pipeable(find_);

function findSafe<E, Z>(
  self: Cause<E>,
  f: (cause: Cause<E>) => Option<Z>
): Eval<Option<Z>> {
  const result = f(self);
  if (result._tag === "Some") {
    return Eval.succeed(result);
  }
  realCause(self);
  switch (self._tag) {
    case "Both":
    case "Then":
      return Eval.suspend(findSafe(self.left, f)).flatMap((leftResult) =>
        leftResult._tag === "Some" ? Eval.succeedNow(leftResult) : findSafe(self.right, f)
      ) as Eval<Option<Z>>;
    case "Stackless": {
      return Eval.suspend(findSafe(self.cause, f));
    }
    default:
      return Eval.succeed(result);
  }
}

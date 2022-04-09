import { realCause } from "@effect/core/io/Cause/definition";

/**
 * Folds over the cases of this cause with the specified functions.
 *
 * @tsplus fluent ets/Cause fold
 */
export function fold_<E, Z>(
  self: Cause<E>,
  onEmptyCause: LazyArg<Z>,
  onFailCause: (e: E, trace: Trace) => Z,
  onDieCause: (e: unknown, trace: Trace) => Z,
  onInterruptCause: (fiberId: FiberId, trace: Trace) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
): Z {
  return foldSafe(
    self,
    onEmptyCause,
    onFailCause,
    onDieCause,
    onInterruptCause,
    onThenCause,
    onBothCause,
    onStacklessCause
  ).run();
}

/**
 * Folds over the cases of this cause with the specified functions.
 *
 * @tsplus static ets/Cause/Aspects fold
 */
export const fold = Pipeable(fold_);

function foldSafe<E, Z>(
  self: Cause<E>,
  onEmptyCause: LazyArg<Z>,
  onFailCause: (e: E, trace: Trace) => Z,
  onDieCause: (e: unknown, trace: Trace) => Z,
  onInterruptCause: (fiberId: FiberId, trace: Trace) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
): Eval<Z> {
  realCause(self);
  switch (self._tag) {
    case "Empty":
      return Eval.succeed(onEmptyCause);
    case "Fail":
      return Eval.succeed(onFailCause(self.value, self.trace));
    case "Die":
      return Eval.succeed(onDieCause(self.value, self.trace));
    case "Interrupt":
      return Eval.succeed(onInterruptCause(self.fiberId, self.trace));
    case "Both":
      return Eval.suspend(
        foldSafe(
          self.left,
          onEmptyCause,
          onFailCause,
          onDieCause,
          onInterruptCause,
          onThenCause,
          onBothCause,
          onStacklessCause
        )
      ).zipWith(
        Eval.suspend(
          foldSafe(
            self.right,
            onEmptyCause,
            onFailCause,
            onDieCause,
            onInterruptCause,
            onThenCause,
            onBothCause,
            onStacklessCause
          )
        ),
        (left, right) => onBothCause(left, right)
      );
    case "Then":
      return Eval.suspend(
        foldSafe(
          self.left,
          onEmptyCause,
          onFailCause,
          onDieCause,
          onInterruptCause,
          onThenCause,
          onBothCause,
          onStacklessCause
        )
      ).zipWith(
        Eval.suspend(
          foldSafe(
            self.right,
            onEmptyCause,
            onFailCause,
            onDieCause,
            onInterruptCause,
            onThenCause,
            onBothCause,
            onStacklessCause
          )
        ),
        (left, right) => onThenCause(left, right)
      );
    case "Stackless":
      return Eval.suspend(
        foldSafe(
          self.cause,
          onEmptyCause,
          onFailCause,
          onDieCause,
          onInterruptCause,
          onThenCause,
          onBothCause,
          onStacklessCause
        )
      ).map((z) => onStacklessCause(z, self.stackless));
  }
}

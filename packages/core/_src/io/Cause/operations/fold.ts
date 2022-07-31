import { realCause } from "@effect/core/io/Cause/definition"

/**
 * Folds over the cases of this cause with the specified functions.
 *
 * @tsplus static effect/core/io/Cause.Aspects fold
 * @tsplus pipeable effect/core/io/Cause fold
 */
export function fold<E, Z>(
  onEmptyCause: LazyArg<Z>,
  onFailCause: (e: E) => Z,
  onDieCause: (e: unknown) => Z,
  onInterruptCause: (fiberId: FiberId) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
) {
  return (self: Cause<E>): Z =>
    foldSafe(
      self,
      onEmptyCause,
      onFailCause,
      onDieCause,
      onInterruptCause,
      onThenCause,
      onBothCause,
      onStacklessCause
    ).run
}

function foldSafe<E, Z>(
  self: Cause<E>,
  onEmptyCause: LazyArg<Z>,
  onFailCause: (e: E) => Z,
  onDieCause: (e: unknown) => Z,
  onInterruptCause: (fiberId: FiberId) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
): Eval<Z> {
  realCause(self)
  switch (self._tag) {
    case "Empty": {
      return Eval.succeed(onEmptyCause)
    }
    case "Fail": {
      return Eval.succeed(onFailCause(self.value))
    }
    case "Die": {
      return Eval.succeed(onDieCause(self.value))
    }
    case "Interrupt": {
      return Eval.succeed(onInterruptCause(self.fiberId))
    }
    case "Both": {
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
      )
    }
    case "Then": {
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
      )
    }
    case "Stackless": {
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
      ).map((z) => onStacklessCause(z, self.stackless))
    }
  }
}

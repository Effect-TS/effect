import { realCause } from "@effect/core/io/Cause/definition"

/**
 * Folds over the cases of this cause with the specified functions.
 *
 * @tsplus static effect/core/io/Cause.Aspects fold
 * @tsplus pipeable effect/core/io/Cause fold
 */
export function fold<E, Z>(
  onEmptyCause: Z,
  onFailCause: (e: E) => Z,
  onDieCause: (e: unknown) => Z,
  onInterruptCause: (fiberId: FiberId) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onAnnotated: (z: Z, annotation: unknown) => Z
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
      onAnnotated
    ).run
}

function foldSafe<E, Z>(
  self: Cause<E>,
  onEmptyCause: Z,
  onFailCause: (e: E) => Z,
  onDieCause: (e: unknown) => Z,
  onInterruptCause: (fiberId: FiberId) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onAnnotated: (z: Z, annotation: unknown) => Z
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
          onAnnotated
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
            onAnnotated
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
          onAnnotated
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
            onAnnotated
          )
        ),
        (left, right) => onThenCause(left, right)
      )
    }
    case "Annotated": {
      return Eval.suspend(
        foldSafe(
          self.cause,
          onEmptyCause,
          onFailCause,
          onDieCause,
          onInterruptCause,
          onThenCause,
          onBothCause,
          onAnnotated
        )
      ).map((z) => onAnnotated(z, self.annotation))
    }
  }
}

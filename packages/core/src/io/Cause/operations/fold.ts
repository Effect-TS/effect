import { realCause } from "@effect/core/io/Cause/definition"
import { pipe } from "@fp-ts/data/Function"
import * as SafeEval from "@fp-ts/data/SafeEval"

/**
 * Folds over the cases of this cause with the specified functions.
 *
 * @tsplus static effect/core/io/Cause.Aspects fold
 * @tsplus pipeable effect/core/io/Cause fold
 * @category folding
 * @since 1.0.0
 */
export function fold<E, Z>(
  onEmptyCause: Z,
  onFailCause: (e: E) => Z,
  onDieCause: (e: unknown) => Z,
  onInterruptCause: (fiberId: FiberId) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
) {
  return (self: Cause<E>): Z =>
    SafeEval.execute(foldSafe(
      self,
      onEmptyCause,
      onFailCause,
      onDieCause,
      onInterruptCause,
      onThenCause,
      onBothCause,
      onStacklessCause
    ))
}

function foldSafe<E, Z>(
  self: Cause<E>,
  onEmptyCause: Z,
  onFailCause: (e: E) => Z,
  onDieCause: (e: unknown) => Z,
  onInterruptCause: (fiberId: FiberId) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
): SafeEval.SafeEval<Z> {
  realCause(self)
  switch (self._tag) {
    case "Empty": {
      return SafeEval.succeed(onEmptyCause)
    }
    case "Fail": {
      return SafeEval.succeed(onFailCause(self.value))
    }
    case "Die": {
      return SafeEval.succeed(onDieCause(self.value))
    }
    case "Interrupt": {
      return SafeEval.succeed(onInterruptCause(self.fiberId))
    }
    case "Both": {
      return pipe(
        SafeEval.suspend(() =>
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
        ),
        SafeEval.zipWith(
          SafeEval.suspend(() =>
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
      )
    }
    case "Then": {
      return pipe(
        SafeEval.suspend(() =>
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
        ),
        SafeEval.zipWith(
          SafeEval.suspend(() =>
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
      )
    }
    case "Stackless": {
      return pipe(
        SafeEval.suspend(() =>
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
        ),
        SafeEval.map((z) => onStacklessCause(z, self.stackless))
      )
    }
  }
}

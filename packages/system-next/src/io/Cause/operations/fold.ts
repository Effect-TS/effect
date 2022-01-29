import type { LazyArg } from "../../../data/Function"
import type { Trace } from "../../../io/Trace/definition"
import { IO } from "../../../io-light/IO/core"
import type { FiberId } from "../../FiberId/definition"
import type { Cause } from "../definition"
import { realCause } from "../definition"

/**
 * Folds over the cases of this cause with the specified functions.
 *
 * @ets fluent ets/Cause fold
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
  ).run()
}

/**
 * Folds over the cases of this cause with the specified functions.
 *
 * @ets_data_first fold_
 */
export function fold<Z, E>(
  onEmptyCause: LazyArg<Z>,
  onFailCause: (e: E, trace: Trace) => Z,
  onDieCause: (e: unknown, trace: Trace) => Z,
  onInterruptCause: (fiberId: FiberId, trace: Trace) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
) {
  return (self: Cause<E>): Z =>
    self.fold(
      onEmptyCause,
      onFailCause,
      onDieCause,
      onInterruptCause,
      onThenCause,
      onBothCause,
      onStacklessCause
    )
}

function foldSafe<E, Z>(
  self: Cause<E>,
  onEmptyCause: LazyArg<Z>,
  onFailCause: (e: E, trace: Trace) => Z,
  onDieCause: (e: unknown, trace: Trace) => Z,
  onInterruptCause: (fiberId: FiberId, trace: Trace) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
): IO<Z> {
  realCause(self)
  switch (self._tag) {
    case "Empty":
      return IO.succeed(onEmptyCause)
    case "Fail":
      return IO.succeed(onFailCause(self.value, self.trace))
    case "Die":
      return IO.succeed(onDieCause(self.value, self.trace))
    case "Interrupt":
      return IO.succeed(onInterruptCause(self.fiberId, self.trace))
    case "Both":
      return IO.suspend(
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
        IO.suspend(
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
    case "Then":
      return IO.suspend(
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
        IO.suspend(
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
    case "Stackless":
      return IO.suspend(
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

// ets_tracing: off

import type { FiberId } from "../../FiberId"
import * as IO from "../../IO"
import type { Trace } from "../../Trace"
import type { Cause } from "../definition"

/**
 * Folds over the cases of this cause with the specified functions.
 */
export function fold_<E, Z>(
  self: Cause<E>,
  onEmptyCause: () => Z,
  onFailCause: (e: E, trace: Trace) => Z,
  onDieCause: (e: unknown, trace: Trace) => Z,
  onInterruptCause: (fiberId: FiberId, trace: Trace) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
): Z {
  return IO.run(
    foldSafe(
      self,
      onEmptyCause,
      onFailCause,
      onDieCause,
      onInterruptCause,
      onThenCause,
      onBothCause,
      onStacklessCause
    )
  )
}

/**
 * Folds over the cases of this cause with the specified functions.
 *
 * @ets_data_first fold_
 */
export function fold<Z, E>(
  onEmptyCause: () => Z,
  onFailCause: (e: E, trace: Trace) => Z,
  onDieCause: (e: unknown, trace: Trace) => Z,
  onInterruptCause: (fiberId: FiberId, trace: Trace) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
) {
  return (self: Cause<E>): Z =>
    fold_(
      self,
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
  onEmptyCause: () => Z,
  onFailCause: (e: E, trace: Trace) => Z,
  onDieCause: (e: unknown, trace: Trace) => Z,
  onInterruptCause: (fiberId: FiberId, trace: Trace) => Z,
  onThenCause: (x: Z, y: Z) => Z,
  onBothCause: (x: Z, y: Z) => Z,
  onStacklessCause: (z: Z, stackless: boolean) => Z
): IO.IO<Z> {
  switch (self._tag) {
    case "Empty":
      return IO.succeedWith(onEmptyCause)
    case "Fail":
      return IO.succeed(onFailCause(self.value, self.trace))
    case "Die":
      return IO.succeed(onDieCause(self.value, self.trace))
    case "Interrupt":
      return IO.succeed(onInterruptCause(self.fiberId, self.trace))
    case "Both":
      return IO.zipWith_(
        IO.suspend(() =>
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
        IO.suspend(() =>
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
      return IO.zipWith_(
        IO.suspend(() =>
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
        IO.suspend(() =>
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
      return IO.map_(
        IO.suspend(() =>
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
        (z) => onStacklessCause(z, self.stackless)
      )
  }
}

import { FunctionN } from "fp-ts/lib/function"

import { Effect, AsyncRE } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { completed } from "./completed"
import { raceFold } from "./raceFold"
import { zipWith_ } from "./zipWith"

/**
 * Zip the result of 2 ios executed in parallel together with the provided function.
 * Interrupt at first failure returning the error
 * @param ioa
 * @param iob
 * @param f
 */
export function parFastZipWith<S, S2, R, R2, E, E2, A, B, C>(
  ioa: Effect<S, R, E, A>,
  iob: Effect<S2, R2, E2, B>,
  f: FunctionN<[A, B], C>
): AsyncRE<R & R2, E | E2, C> {
  return raceFold(
    ioa,
    iob,
    (aExit, bFiber) =>
      aExit._tag === "Done"
        ? zipWith_(completed(aExit), bFiber.join, f)
        : chain_(bFiber.isComplete, (isCompleted) =>
            isCompleted
              ? zipWith_(completed(aExit), bFiber.join, f)
              : chain_(bFiber.interrupt, (x) =>
                  x._tag === "Interrupt" && x.errors && x.errors.length > 0
                    ? completed(x)
                    : completed(aExit)
                )
          ),
    (bExit, aFiber) =>
      bExit._tag === "Done"
        ? zipWith_(aFiber.join, completed(bExit), f)
        : chain_(aFiber.isComplete, (isCompleted) =>
            isCompleted
              ? zipWith_(aFiber.join, completed(bExit), f)
              : chain_(aFiber.interrupt, (x) =>
                  x._tag === "Interrupt" && x.errors && x.errors.length > 0
                    ? completed(x)
                    : completed(bExit)
                )
          )
  )
}

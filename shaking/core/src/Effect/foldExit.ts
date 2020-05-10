import { FunctionN } from "fp-ts/lib/function"

import { Cause } from "../Exit"
import { ICollapse } from "../Support/Common"
import { Effect } from "../Support/Common/effect"

export const foldExit_: <S1, S2, S3, R, E1, R2, E2, A1, A2, A3, R3, E3>(
  inner: Effect<S1, R, E1, A1>,
  failure: FunctionN<[Cause<E1>], Effect<S2, R2, E2, A2>>,
  success: FunctionN<[A1], Effect<S3, R3, E3, A3>>
) => Effect<S1 | S2 | S3, R & R2 & R3, E2 | E3, A2 | A3> = (inner, failure, success) =>
  new ICollapse(inner, failure, success) as any

/**
 * Curried form of foldExit
 * @param failure
 * @param success
 */

export function foldExit<S1, E1, RF, E2, A1, S2, E3, A2, RS>(
  failure: FunctionN<[Cause<E1>], Effect<S1, RF, E2, A2>>,
  success: FunctionN<[A1], Effect<S2, RS, E3, A2>>
): <S, R>(io: Effect<S, R, E1, A1>) => Effect<S | S1 | S2, RF & RS & R, E2 | E3, A2> {
  return (io) => foldExit_(io, failure, success)
}

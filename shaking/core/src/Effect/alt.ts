import { Effect, AsyncRE } from "../Support/Common/effect"

import { chainError_ } from "./chainError"

export function alt<R2, E2, A>(
  fy: () => AsyncRE<R2, E2, A>
): <R, E, B>(fx: AsyncRE<R, E, B>) => AsyncRE<R & R2, E2, A | B> {
  return (fx) => alt_(fx, fy)
}

export const alt_: <S1, S2, R, R2, E, E2, A, B>(
  fx: Effect<S1, R, E, A>,
  fy: () => Effect<S2, R2, E2, B>
) => Effect<S1 | S2, R & R2, E2, A | B> = chainError_

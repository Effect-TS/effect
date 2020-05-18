import { raise, withRemaining } from "../Exit"
import type { FunctionN } from "../Function"
import type { Effect } from "../Support/Common/effect"

import { chainError_ } from "./chainError"
import { completed } from "./completed"

/**
 * Map the error produced by an IO
 * @param f
 */
export function mapError<E1, E2>(
  f: FunctionN<[E1], E2>
): <S, R, A>(io: Effect<S, R, E1, A>) => Effect<S, R, E2, A> {
  return (io) => mapLeft_(io, f)
}

export const mapLeft_: <S, R, E, A, G>(
  fea: Effect<S, R, E, A>,
  f: (e: E) => G
) => Effect<S, R, G, A> = (io, f) =>
  chainError_(io, (x, rem) =>
    completed(withRemaining(raise(f(x)), ...(rem._tag === "Some" ? rem.value : [])))
  )

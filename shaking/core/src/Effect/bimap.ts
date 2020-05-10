import { FunctionN, flow } from "fp-ts/lib/function"

import { raise, withRemaining } from "../Exit"
import { Effect } from "../Support/Common/effect"

import { completed } from "./completed"
import { foldExit_ } from "./foldExit"
import { pure } from "./pure"

export const bimap: <E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
) => <S, R>(fa: Effect<S, R, E, A>) => Effect<S, R, G, B> = (f, g) => (fa) =>
  bimap_(fa, f, g)

export function bimap_<S, R, E1, E2, A, B>(
  io: Effect<S, R, E1, A>,
  leftMap: FunctionN<[E1], E2>,
  rightMap: FunctionN<[A], B>
): Effect<S, R, E2, B> {
  return foldExit_(
    io,
    (cause) =>
      cause._tag === "Raise"
        ? completed(
            withRemaining(
              raise(leftMap(cause.error)),
              ...(cause.remaining._tag === "Some" ? cause.remaining.value : [])
            )
          )
        : completed(cause),
    flow(rightMap, pure)
  )
}

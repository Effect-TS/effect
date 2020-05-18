import { Cause, raise, withRemaining } from "../Exit"
import { NonEmptyArray } from "../NonEmptyArray"
import { Option } from "../Option"
import { Effect } from "../Support/Common/effect"

import { chainError_ } from "./chainError"
import { completed } from "./completed"
import { foldExit_ } from "./foldExit"

export const chainErrorTap = <S, R, E1, E2>(
  f: (e: E1, remaining: Option<NonEmptyArray<Cause<any>>>) => Effect<S, R, E2, unknown>
) => <S2, R2, A>(io: Effect<S2, R2, E1, A>) => chainErrorTap_(io, f)

export const chainErrorTap_ = <S, R, E1, S2, R2, E2, A>(
  io: Effect<S, R, E1, A>,
  f: (
    _: E1,
    remaining: Option<NonEmptyArray<Cause<any>>>
  ) => Effect<S2, R2, E2, unknown>
) =>
  chainError_(io, (e, remaining) =>
    foldExit_(
      f(e, remaining),
      (_) =>
        completed(
          withRemaining(
            _,
            raise(e),
            ...(remaining._tag === "Some" ? remaining.value : [])
          )
        ),
      () =>
        completed(
          withRemaining(raise(e), ...(remaining._tag === "Some" ? remaining.value : []))
        )
    )
  )

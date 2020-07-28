import { Cause } from "../Cause/cause"
import { Exit } from "../Exit/exit"

import { bracketExit_ } from "./bracketExit_"
import { Effect } from "./effect"
import { unit } from "./unit"

export const onExit_ = <S, R, E, A, S2, R2, E2>(
  self: Effect<S, R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<S2, R2, E2, any>
): Effect<S | S2, R & R2, E | E2, A> =>
  bracketExit_(
    unit,
    () => self,
    (_, e) => cleanup(e)
  )

export const onExit = <E, A, S2, R2, E2>(
  cleanup: (exit: Exit<E, A>) => Effect<S2, R2, E2, any>
) => <S, R>(self: Effect<S, R, E, A>): Effect<S | S2, R & R2, E | E2, A> =>
  bracketExit_(
    unit,
    () => self,
    (_, e) => cleanup(e)
  )

export const onError = <E, A, S2, R2, E2>(
  cleanup: (exit: Cause<E>) => Effect<S2, R2, E2, any>
) => <S, R>(self: Effect<S, R, E, A>): Effect<S | S2, R & R2, E | E2, A> =>
  onExit_(self, (e) => {
    switch (e._tag) {
      case "Failure": {
        return cleanup(e.cause)
      }
      case "Success": {
        return unit
      }
    }
  })

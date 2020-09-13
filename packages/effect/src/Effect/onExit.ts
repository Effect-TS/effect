import type { Cause } from "../Cause/cause"
import type { Exit } from "../Exit/exit"
import { bracketExit_ } from "./bracketExit_"
import { unit } from "./core"
import type { Effect } from "./effect"

export function onExit_<S, R, E, A, S2, R2, E2>(
  self: Effect<S, R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<S2, R2, E2, any>
): Effect<S | S2, R & R2, E | E2, A> {
  return bracketExit_(
    unit,
    () => self,
    (_, e) => cleanup(e)
  )
}

export function onExit<E, A, S2, R2, E2>(
  cleanup: (exit: Exit<E, A>) => Effect<S2, R2, E2, any>
) {
  return <S, R>(self: Effect<S, R, E, A>): Effect<S | S2, R & R2, E | E2, A> =>
    bracketExit_(
      unit,
      () => self,
      (_, e) => cleanup(e)
    )
}

export function onError<E, A, S2, R2, E2>(
  cleanup: (exit: Cause<E>) => Effect<S2, R2, E2, any>
) {
  return <S, R>(self: Effect<S, R, E, A>): Effect<S | S2, R & R2, E | E2, A> =>
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
}

// tracing: off

import type { Cause } from "../Cause/cause"
import type { Exit } from "../Exit/exit"
import { bracketExit_ } from "./bracketExit"
import { unit } from "./core"
import type { Effect } from "./effect"

export function onExit_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  cleanup: (exit: Exit<E, A>) => Effect<R2, E2, X>
): Effect<R & R2, E | E2, A> {
  return bracketExit_(
    unit,
    () => self,
    (_, e) => cleanup(e)
  )
}

export function onExit<E, A, R2, E2, X>(
  cleanup: (exit: Exit<E, A>) => Effect<R2, E2, X>
) {
  return <R>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
    bracketExit_(
      unit,
      () => self,
      (_, e) => cleanup(e)
    )
}

export function onError<E, A, R2, E2, X>(
  cleanup: (exit: Cause<E>) => Effect<R2, E2, X>
) {
  return <R>(self: Effect<R, E, A>): Effect<R & R2, E | E2, A> =>
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

export function onError_<R, E, A, R2, E2, X>(
  self: Effect<R, E, A>,
  cleanup: (exit: Cause<E>) => Effect<R2, E2, X>
): Effect<R & R2, E | E2, A> {
  return onExit_(self, (e) => {
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

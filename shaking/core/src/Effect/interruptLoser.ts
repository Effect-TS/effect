import { Exit } from "../Exit"
import { AsyncRE } from "../Support/Common/effect"

import { chain_ } from "./chain"
import { completed } from "./completed"
import { Fiber } from "./makeFiber"

export function interruptLoser<R, E, A>(
  exit: Exit<E, A>,
  loser: Fiber<E, A>
): AsyncRE<R, E, A> {
  return chain_(loser.interrupt, (x) =>
    x._tag === "Interrupt" && x.errors && x.errors.length > 0
      ? completed(x)
      : completed(exit)
  )
}

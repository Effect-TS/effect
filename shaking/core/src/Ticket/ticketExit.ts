import * as T from "../Effect"
import type { Exit } from "../Exit"

import type { Ticket } from "./ticket"

export function ticketExit<S, R, A>(
  ticket: Ticket<S, R, A>,
  exit: Exit<never, A>
): T.Effect<S, R, never, void> {
  if (exit._tag === "Interrupt") {
    return ticket.cleanup
  }
  return T.unit
}

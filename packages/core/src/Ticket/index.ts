/* adapted from https://github.com/rzeigler/waveguide */

import * as T from "../Effect"
import { Exit } from "../Exit"

export interface Ticket<S, R, A> {
  readonly acquire: T.Effect<S, R, never, A>
  readonly cleanup: T.Effect<S, R, never, void>
}

export function ticketUse<S, R, A>(ticket: Ticket<S, R, A>): T.Effect<S, R, never, A> {
  return ticket.acquire
}

export function makeTicket<S, R, A>(
  acquire: T.Effect<S, R, never, A>,
  cleanup: T.Effect<S, R, never, void>
): Ticket<S, R, A> {
  return {
    acquire,
    cleanup
  }
}

export function ticketExit<S, R, A>(
  ticket: Ticket<S, R, A>,
  exit: Exit<never, A>
): T.Effect<S, R, never, void> {
  if (exit._tag === "Interrupt") {
    return ticket.cleanup
  }
  return T.unit
}

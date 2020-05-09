import { Effect, unit } from "../Effect"
import { Exit } from "../Exit"

export function ticketExit<S, R, A>(
  ticket: Ticket<S, R, A>,
  exit: Exit<never, A>
): Effect<S, R, never, void> {
  if (exit._tag === "Interrupt") {
    return ticket.cleanup
  }
  return unit
}

export function ticketUse<S, R, A>(ticket: Ticket<S, R, A>): Effect<S, R, never, A> {
  return ticket.acquire
}

export interface Ticket<S, R, A> {
  readonly acquire: Effect<S, R, never, A>
  readonly cleanup: Effect<S, R, never, void>
}

export function makeTicket<S, R, A>(
  acquire: Effect<S, R, never, A>,
  cleanup: Effect<S, R, never, void>
): Ticket<S, R, A> {
  return {
    acquire,
    cleanup
  }
}

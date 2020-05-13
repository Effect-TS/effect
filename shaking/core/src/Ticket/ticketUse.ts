import type { Effect } from "../Effect"

import type { Ticket } from "./ticket"
export function ticketUse<S, R, A>(ticket: Ticket<S, R, A>): Effect<S, R, never, A> {
  return ticket.acquire
}

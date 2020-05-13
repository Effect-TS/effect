import type { Effect } from "../Effect"

import type { Ticket } from "./ticket"

export function makeTicket<S, R, A>(
  acquire: Effect<S, R, never, A>,
  cleanup: Effect<S, R, never, void>
): Ticket<S, R, A> {
  return {
    acquire,
    cleanup
  }
}

/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/ticket.ts
  credits to original author
 */

import * as T from "./effect";
import { Exit } from "./original/exit";

export function ticketExit<R, A>(
  ticket: Ticket<R, A>,
  exit: Exit<never, A>
): T.Effect<R, T.NoErr, void> {
  if (exit._tag === "Interrupt") {
    return ticket.cleanup;
  }
  return T.unit;
}

export function ticketUse<R, A>(ticket: Ticket<R, A>): T.Effect<R, T.NoErr, A> {
  return ticket.acquire;
}

export interface Ticket<R, A> {
  readonly acquire: T.Effect<R, T.NoErr, A>;
  readonly cleanup: T.Effect<R, T.NoErr, void>;
}

export function makeTicket<R, A>(
  acquire: T.Effect<R, T.NoErr, A>,
  cleanup: T.Effect<R, T.NoErr, void>
): Ticket<R, A> {
  return {
    acquire,
    cleanup
  };
}

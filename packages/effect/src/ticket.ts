/*
  based on: https://github.com/rzeigler/waveguide/blob/master/src/ticket.ts
  credits to original author
  small adaptations to extend Monad3E and support contravariance on R
 */

import { Exit, ExitTag } from "waveguide/lib/exit";
import * as T from "./";
import { unit } from "waveguide/lib/waver";

export function ticketExit<A>(
  ticket: Ticket<A>,
  exit: Exit<never, A>
): T.Effect<T.NoEnv, T.NoErr, void> {
  if (exit._tag === ExitTag.Interrupt) {
    return ticket.cleanup;
  }
  return unit;
}

export function ticketUse<A>(ticket: Ticket<A>): T.Effect<T.NoEnv, T.NoErr, A> {
  return ticket.acquire;
}

export interface Ticket<A> {
  readonly acquire: T.Effect<T.NoEnv, T.NoErr, A>;
  readonly cleanup: T.Effect<T.NoEnv, T.NoErr, void>;
}

export function makeTicket<A>(
  acquire: T.Effect<T.NoEnv, T.NoErr, A>,
  cleanup: T.Effect<T.NoEnv, T.NoErr, void>
): Ticket<A> {
  return {
    acquire,
    cleanup
  };
}

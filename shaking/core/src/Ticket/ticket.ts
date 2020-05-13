import type { Effect } from "../Effect"

export interface Ticket<S, R, A> {
  readonly acquire: Effect<S, R, never, A>
  readonly cleanup: Effect<S, R, never, void>
}

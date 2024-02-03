import type { Effect } from "./Effect.js"
import type { Duration } from "./index.js"
import * as internal from "./internal/rateLimiter.js"
import type { Scope } from "./Scope.js"

export interface RateLimiter {
  <R, E, A>(task: Effect<R, E, A>): Effect<R, E, A>
}

export const make = (max: number, interval: Duration.DurationInput): Effect<Scope, never, RateLimiter> =>
  internal.make(max, interval)

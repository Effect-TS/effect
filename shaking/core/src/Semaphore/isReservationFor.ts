import { Deferred } from "../Deferred"

export const isReservationFor = (latch: Deferred<unknown, unknown, never, void>) => (
  rsv: readonly [number, Deferred<unknown, unknown, never, void>]
): boolean => rsv[1] === latch

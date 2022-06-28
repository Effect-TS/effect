/**
 * A schedule that does not recur, it just stops.
 *
 * @tsplus static effect/core/io/Schedule.Ops stop
 */
export const stop: Schedule<number, never, unknown, void> = Schedule.recurs(0).unit

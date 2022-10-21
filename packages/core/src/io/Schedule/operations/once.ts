/**
 * A schedule that recurs one time.
 *
 * @tsplus static effect/core/io/Schedule.Ops once
 */
export const once: Schedule<number, never, unknown, void> = Schedule.recurs(1).unit

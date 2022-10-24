/**
 * A schedule that recurs one time.
 *
 * @tsplus static effect/core/io/Schedule.Ops once
 * @category constructors
 * @since 1.0.0
 */
export const once: Schedule<number, never, unknown, void> = Schedule.recurs(1).unit

/**
 * A schedule that always recurs, which counts the number of recurrences.
 *
 * @tsplus static effect/core/io/Schedule.Ops count
 * @category constructors
 * @since 1.0.0
 */
export const count: Schedule<number, never, unknown, number> = Schedule.unfold(0, (n) => n + 1)

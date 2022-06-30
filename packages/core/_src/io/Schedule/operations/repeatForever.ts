/**
 * A schedule that always recurs, producing a count of repeats: 0, 1, 2.
 *
 * @tsplus static effect/core/io/Schedule.Ops repeatForever
 */
export const repeatForever: Schedule<number, never, unknown, number> = Schedule.unfold(0, (n) => n + 1)

/**
 * A schedule that always recurs, which counts the number of recurrences.
 *
 * @tsplus static ets/Schedule/Ops count
 */
export const count: Schedule<number, unknown, unknown, number> = Schedule.unfold(0, (n) => n + 1);

/**
 * A schedule that does not recur, it just stops.
 *
 * @tsplus static ets/Schedule/Ops stop
 */
export const stop: Schedule.WithState<number, unknown, unknown, void> = Schedule.recurs(0).asUnit();

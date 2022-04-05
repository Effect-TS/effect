/**
 * A schedule that recurs one time.
 *
 * @tsplus static ets/Schedule/Ops once
 */
export const once: Schedule.WithState<number, unknown, unknown, void> = Schedule.recurs(1).asUnit();

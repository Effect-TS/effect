/**
 * @tsplus static ets/Clock/Ops currentTime
 */
export const currentTime: Effect.UIO<number> = Effect.clockWith((clock) => clock.currentTime);

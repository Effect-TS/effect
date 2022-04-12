/**
 * @tsplus static ets/Clock/Ops currentTime
 */
export const currentTime: UIO<number> = Effect.clockWith((clock) => clock.currentTime);

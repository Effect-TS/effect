/**
 * @tsplus static ets/Clock/Ops sleep
 */
export function sleep(duration: LazyArg<Duration>, __tsplusTrace?: string): UIO<void> {
  return Effect.clockWith((clock) => clock.sleep(duration));
}

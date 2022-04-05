/**
 * Returns an effect that suspends for the specified duration. This method is
 * asynchronous, and does not actually block the fiber executing the effect.
 *
 * @tsplus static ets/Effect/Ops sleep
 */
export function sleep(
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): RIO<HasClock, void> {
  return Effect.serviceWithEffect(HasClock)((_) => _.sleep(duration));
}

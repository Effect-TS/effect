/**
 * Returns an effect that runs this effect and in case of failure, runs each
 * of the specified effects in order until one of them succeeds.
 *
 * @tsplus static ets/Effect/Ops firstSuccessOf
 */
export function firstSuccessOf<R, E, A>(
  effects: Collection<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(() => {
    const chunk = Chunk.from(effects);
    if (chunk.length <= 0) {
      return Effect.die(new IllegalArgumentException(`received empty collection of effects`));
    }
    const head = chunk.unsafeHead()!;
    const tail = chunk.length === 1 ? Chunk.empty<Effect<R, E, A>>() : chunk.unsafeTail()!;
    return tail.reduce(head, (b, a) => b | a);
  });
}

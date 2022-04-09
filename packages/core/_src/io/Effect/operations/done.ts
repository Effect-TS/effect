/**
 * Returns an effect from a `Exit` value.
 *
 * @tsplus static ets/Effect/Ops done
 */
export function done<E, A>(
  exit: LazyArg<Exit<E, A>>,
  __tsplusTrace?: string
): IO<E, A> {
  return Effect.suspendSucceed(() => {
    const exit0 = exit();
    return exit0._tag === "Success"
      ? Effect.succeedNow(exit0.value)
      : Effect.failCauseNow(exit0.cause);
  });
}

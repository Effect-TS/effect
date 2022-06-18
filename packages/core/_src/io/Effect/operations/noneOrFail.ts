/**
 * Lifts an `Maybe` into a `IO`. If the option is empty it succeeds with
 * `undefined`. If the option is defined it fails with the content.
 *
 * @tsplus static ets/Effect/Ops noneOrFail
 */
export function noneOrFail<E>(
  option: LazyArg<Maybe<E>>,
  __tsplusTrace?: string
): Effect.IO<E, void> {
  return Effect.getOrFailDiscard(option).flip()
}

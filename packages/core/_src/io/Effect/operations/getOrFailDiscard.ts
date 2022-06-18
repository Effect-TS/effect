/**
 * Lifts an `Maybe` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @tsplus static ets/Effect/Ops getOrFailDiscard
 */
export function getOrFailDiscard<A>(
  option: LazyArg<Maybe<A>>,
  __tsplusTrace?: string
): Effect.IO<void, A> {
  return Effect.getOrFailWith(option, () => undefined)
}

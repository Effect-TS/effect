/**
 * Lifts an `Maybe` into an `Effect`, if the option is not defined it fails
 * with `NoSuchElementException`.
 *
 * @tsplus static ets/Effect/Ops getOrFail
 */
export function getOrFail<A>(
  option: LazyArg<Maybe<A>>,
  __tsplusTrace?: string
): Effect.IO<NoSuchElement, A> {
  return Effect.getOrFailWith(option, new NoSuchElement())
}

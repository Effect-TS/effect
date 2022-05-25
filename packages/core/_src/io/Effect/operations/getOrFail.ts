/**
 * Lifts an `Option` into an `Effect`, if the option is not defined it fails
 * with `NoSuchElementException`.
 *
 * @tsplus static ets/Effect/Ops getOrFail
 */
export function getOrFail<A>(
  option: LazyArg<Option<A>>,
  __tsplusTrace?: string
): Effect.IO<NoSuchElement, A> {
  return Effect.getOrFailWith(option, new NoSuchElement())
}

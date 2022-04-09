/**
 * Lifts an `Option` into a `IO`, if the option is not defined it fails with
 * `void`.
 *
 * @tsplus static ets/Effect/Ops getOrFailDiscard
 */
export function getOrFailDiscard<A>(
  option: LazyArg<Option<A>>,
  __tsplusTrace?: string
): IO<void, A> {
  return Effect.getOrFailWith(option, () => undefined);
}

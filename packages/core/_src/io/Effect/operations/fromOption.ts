/**
 * Lifts an `Option` into an `Effect` but preserves the error as an option in
 * the error channel, making it easier to compose in some scenarios.
 *
 * @tsplus static ets/Effect/Ops fromOption
 */
export function fromOption<A>(
  option: LazyArg<Option<A>>,
  __tsplusTrace?: string
): Effect.IO<Option<never>, A> {
  return Effect.succeed(option).flatMap((option) => option.fold(Effect.fail(Option.none), Effect.succeedNow));
}

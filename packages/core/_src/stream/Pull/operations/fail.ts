/**
 * @tsplus static ets/Pull/Ops fail
 */
export function fail<E>(e: E): IO<Option<E>, never> {
  return Effect.fail(Option.some(e));
}

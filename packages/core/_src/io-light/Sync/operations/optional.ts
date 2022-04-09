/**
 * Converts an option on errors into an option on values.
 *
 * @tsplus fluent ets/Sync optional
 */
export function optional<R, E, A>(self: Sync<R, Option<E>, A>): Sync<R, E, Option<A>> {
  return self.foldSync(
    (option) =>
      option.fold(
        () => Sync.succeed(Option.none),
        (e) => Sync.fail(e)
      ),
    (a) => Sync.succeed(Option.some(a))
  );
}

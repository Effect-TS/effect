/**
 * Lifts an `Either` into a `Sync` value.
 *
 * @tsplus static ets/Sync/Ops fromEither
 */
export function fromEither<E, A>(f: LazyArg<Either<E, A>>) {
  return Sync.succeed(f).flatMap((either) =>
    either.fold(
      (e) => Sync.fail(e),
      (a) => Sync.succeed(a)
    )
  );
}

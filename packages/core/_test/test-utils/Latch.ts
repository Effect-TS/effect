export function withLatch<R, E, A>(
  f: (release: UIO<void>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Deferred.make<never, void>().flatMap(
    (latch) => f(latch.succeed(undefined).asUnit()) < latch.await()
  );
}

export function withLatchAwait<R, E, A>(
  f: (release: UIO<void>, await: UIO<void>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Effect.Do()
    .bind("ref", () => Ref.make(true))
    .bind("latch", () => Deferred.make<never, void>())
    .bind("result", ({ latch, ref }) =>
      f(
        latch.succeed(undefined).asUnit(),
        Effect.uninterruptibleMask(
          ({ restore }) => ref.set(false) > restore(latch.await())
        )
      ))
    .tap(({ latch, ref }) => Effect.whenEffect(ref.get(), latch.await()))
    .map(({ result }) => result);
}

export function withLatch<R, E, A>(
  f: (release: Effect<never, never, void>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Deferred.make<never, void>().flatMap(
    (latch) => f(latch.succeed(undefined).unit).zipLeft(latch.await)
  )
}

export function withLatchAwait<R, E, A>(
  f: (release: Effect<never, never, void>, await: Effect<never, never, void>) => Effect<R, E, A>
): Effect<R, E, A> {
  return Do(($) => {
    const ref = $(Ref.make(true))
    const latch = $(Deferred.make<never, void>())
    const result = $(
      f(
        latch.succeed(undefined).unit,
        Effect.uninterruptibleMask(({ restore }) => ref.set(false).zipRight(restore(latch.await)))
      )
    )
    $(Effect.whenEffect(ref.get, latch.await))
    return result
  })
}

/**
 * When the stream fails, retry it according to the given schedule
 *
 * This retries the entire stream, so will re-execute all of the stream's
 * acquire operations.
 *
 * The schedule is reset as soon as the first element passes through the
 * stream again.
 *
 * @param schedule Schedule receiving as input the errors of the stream.
 *
 * @tsplus static effect/core/stream/Stream.Aspects retry
 * @tsplus pipeable effect/core/stream/Stream retry
 */
export function retry<E, S, R2, Z>(
  schedule: LazyArg<Schedule<S, R2, E, Z>>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E, A> =>
    Stream.unwrap(
      schedule()
        .driver
        .map((driver) => {
          const loop: Stream<R | R2, E, A> = self.catchAll((e) =>
            Stream.unwrap(
              driver.next(e).foldEffect(
                () => Effect.fail(e),
                () => Effect.succeed(loop.tap(() => driver.reset))
              )
            )
          )
          return loop
        })
    )
}

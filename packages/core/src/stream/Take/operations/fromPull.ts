/**
 * Creates effect from `Pull<R, E, A>` that does not fail, but succeeds with the
 * `Take<E, A>`. Any error returned from stream when pulling is converted to
 * `Take.failCause`, and the end of stream to `Take.end`.
 *
 * @tsplus static effect/core/stream/Take.Ops fromPull
 * @category conversions
 * @since 1.0.0
 */
export function fromPull<R, E, A>(pull: Pull<R, E, A>): Effect<R, never, Take<E, A>> {
  return pull.foldCause(
    (cause) => {
      const option = Cause.flipCauseOption(cause)
      switch (option._tag) {
        case "None": {
          return Take.end
        }
        case "Some": {
          return Take.failCause(option.value)
        }
      }
    },
    Take.chunk
  )
}

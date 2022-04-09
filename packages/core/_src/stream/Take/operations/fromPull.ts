/**
 * Creates effect from `Pull<R, E, A>` that does not fail, but succeeds with the
 * `Take<E, A>`. Any error returned from stream when pulling is converted to
 * `Take.failCause`, and the end of stream to `Take.end`.
 *
 * @tsplus static ets/Take/Ops fromPull
 */
export function fromPull<R, E, A>(pull: Pull<R, E, A>): RIO<R, Take<E, A>> {
  return pull.foldCause(
    (cause) => Cause.flipCauseOption(cause).fold(() => Take.end, Take.failCause),
    Take.chunk
  );
}

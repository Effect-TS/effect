/**
 * Creates a new `Cached` value that is automatically refreshed according to
 * the specified policy. Note that error retrying is not performed
 * automatically, so if you want to retry on errors, you should first apply
 * retry policies to the acquisition effect before passing it to this
 * constructor.
 *
 * @tsplus static effect/core/io/Cached.Ops auto
 * @category constructors
 * @since 1.0.0
 */
export function auto<R, Error, Resource, State, Env, In, Out>(
  acquire: Effect<R, Error, Resource>,
  policy: Schedule<State, Env, In, Out>
): Effect<R | Env | Scope, never, Cached<Error, Resource>> {
  return Do(($) => {
    const manual = $(Cached.manual(acquire))
    $(
      Effect.acquireRelease(
        manual.refresh.schedule(policy).interruptible.forkDaemon,
        (fiber) => fiber.interrupt
      )
    )
    return manual
  })
}

/**
 * The `Live` trait provides access to the "live" default ZIO services from
 * within ZIO Test for workflows such as printing test results to the console or
 * timing out tests where it is necessary to access the real implementations of
 * these services.
 *
 * The easiest way to access the "live" services is to use the `live` method
 * with a workflow that would otherwise use the test version of the default ZIO
 * services.
 *
 * {{{
 * import zio.Clock
 * import zio.test._
 *
 * val realTime = live(Clock.nanoTime)
 * }}}
 *
 * The `withLive` method can be used to apply a transformation to a workflow
 * with the live services while ensuring that the workflow itself still runs
 * with the test services, for example to time out a test. Both of these methods
 * are re-exported in the ZIO Test package object for easy availability.
 *
 * @tsplus type effect/core/testing/Live
 */
export interface Live {
  readonly provide: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>
}

/**
 * @tsplus type effect/core/testing/Live.Ops
 */
export interface LiveOps {
  readonly Tag: Tag<Live>
}
export const Live: LiveOps = {
  Tag: Tag<Live>()
}

/**
 * Constructs a new `Live` service that implements the `Live` interface. This
 * typically should not be necessary as the `TestEnvironment` already includes
 * the `Live` service but could be useful if you are mixing in interfaces to
 * create your own environment type.
 *
 * @tsplus static effect/core/testing/Live.Ops default
 */
export const defaultLive = Layer.fromEffect(Live.Tag)(
  Effect.environmentWith<never, Live>((env) => ({
    provide: (effect) =>
      effect.apply(
        DefaultServices.currentServices.locallyWith((_) => _.merge(env))
      )
  }))
)

/**
 * Provides a workflow with the "live" default ZIO services.
 *
 * @tsplus static effect/core/testing/Live.Ops live
 */
export function live<R, E, A>(effect: Effect<R, E, A>): Effect<R | Live, E, A> {
  return Effect.serviceWithEffect(Live.Tag, (live) => live.provide(effect))
}

/**
 * Runs a transformation function with the live default Effect services while
 * ensuring that the workflow itself is run with the test services.
 *
 * @tsplus static effect/core/testing/Live.Ops withLive
 */
export function withLive<R, E, A, R2, E2, A2>(
  effect: Effect<R, E, A>,
  f: (effect: Effect<R, E, A>) => Effect<R2, E2, A2>
): Effect<R | R2 | Live, E | E2, A2> {
  return DefaultServices.currentServices.getWith((services) =>
    Live.live(f(DefaultServices.currentServices.locally(services)(effect)))
  )
}
